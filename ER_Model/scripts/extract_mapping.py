"""
generate_mapping_live.py
------------------------
Maps recipe ingredients to products by searching supermarkets directly via API.
Additionally, it syncs discovered products and their current prices to:
  - dim_product
  - dim_date
  - fact_productprice
"""

import argparse
import os
import re
import time
import unicodedata
import requests

import numpy as np
import pandas as pd
from pathlib import Path
from rapidfuzz import fuzz
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────
base_dir = Path(__file__).resolve().parents[2]

DEFAULT_OUT_PATH = base_dir / 'scripts' / 'ingredient_product_matching' / 'outputs' / 'ingredient_product_mapping_live.csv'

SEARCH_API_URL = "https://content-api.prices-crawler.duckdns.org/api/v1/products/search"
MODEL_NAME     = 'paraphrase-multilingual-MiniLM-L12-v2'

# Supabase Setup
URL_SB = os.environ.get("SUPABASE_URL")
KEY_SB = os.environ.get("SUPABASE_KEY")

CATALOGS = [
    "pt.continente",
    "pt.pingo-doce"
]

SUPERMARKET_MAP = {
    "continente": 1,
    "pingo-doce": 2
}

BRANDS = [
    'pingo doce', 'continente', 'auchan', 'minipreco', 'mini preco',
    'pura vida', 'seara', 'nobre', 'intermarche', 'lidl', 'mercadona',
    'el corte ingles', 'jumbo', 'dia', 'bom dia',
]

QUALITY_GATE = 0.60


# ── Text helpers ───────────────────────────────────────────────────────────────

def normalizar(texto: str) -> str:
    if not isinstance(texto, str):
        return ""
    texto = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode()
    texto = texto.lower()
    texto = re.sub(r'\d+[\.,]?\d*\s*(kg|g|ml|l|cl|un|gr)\b', '', texto)
    texto = re.sub(r'[^a-z\s]', '', texto)
    return ' '.join(texto.split())


def clean_brands(texto: str) -> str:
    for brand in BRANDS:
        pattern = r'\b' + re.escape(brand) + r'\b'
        texto = re.sub(pattern, '', texto)
    return ' '.join(texto.split())


def get_supermarket_id(catalog_str: str) -> int:
    s = catalog_str.lower()
    for name, sid in SUPERMARKET_MAP.items():
        if name in s:
            return sid
    return 0

def clean_price(x):
    if pd.isna(x) or x is None: return None
    if isinstance(x, (int, float)): return float(x)
    # Remove currency, spaces, and handle european decimal comma
    s = str(x).strip().replace("€", "").replace(",", ".")
    # Remove everything except digits and dots
    s = re.sub(r"[^\d\.]", "", s)
    # Handle multiple dots or trailing dots (keep only the first dot if many)
    if s.count('.') > 1:
        parts = s.split('.')
        s = parts[0] + "." + "".join(parts[1:])
    # Strip trailing dot
    s = s.rstrip('.')
    try:
        return float(s) if s else None
    except ValueError:
        return None

def extract_quantity_and_unit(qty_str):
    """
    Splits string like 'emb. 1 kg' or '500 gr' into (weight, unit).
    Returns a tuple: (float, str) e.g., (1.0, 'kg')
    """
    if not qty_str or pd.isna(qty_str):
        return None, None
        
    s = str(qty_str).lower().replace(',', '.')
    # Extract only the first number (integer or float)
    num_match = re.search(r'(\d+(?:\.\d+)?)', s)
    weight = float(num_match.group(1)) if num_match else None
    
    # Extract potential unit based on common supermarket formats
    # Note: 'emb. 1 kg' -> unit is 'kg'
    unit = None
    if re.search(r'\b(kg|quilos?)\b', s): unit = 'kg'
    elif re.search(r'\b(g|gr|gramas?)\b', s): unit = 'g'
    elif re.search(r'\b(l|lt|lts|litros?)\b', s): unit = 'l'
    elif re.search(r'\b(ml|mililitros?)\b', s): unit = 'ml'
    elif re.search(r'\b(cl|centilitros?)\b', s): unit = 'cl'
    elif re.search(r'\b(un|unidades?)\b', s): unit = 'un'
    
    # In case weight is found but unit wasn't recognized by the regex, fallback:
    if unit is None and weight is not None:
        unit = re.sub(r'[^a-zA-Z]', '', s.replace('emb', '')).strip()
        
    return weight, unit


# ── API Search ────────────────────────────────────────────────────────────────

def search_products(query: str):
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://prices-crawler.vercel.app",
        "User-Agent": "Mozilla/5.0"
    }
    payload = {"query": query, "catalogs": CATALOGS}
    try:
        response = requests.post(SEARCH_API_URL, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"   [API Error] {e}")
    return []


# ── Main pipeline ──────────────────────────────────────────────────────────────

def main(args: argparse.Namespace) -> None:
    t_global = time.time()
    supabase = None
    if URL_SB and KEY_SB:
        try:
            supabase = create_client(URL_SB, KEY_SB)
            # Test connection
            supabase.table("dim_ingredient").select("ingredient_id").limit(1).execute()
            print("   [Supabase] Connection verified.")
        except Exception as e:
            print(f"   [Supabase Connection Error] {e}")
            supabase = None
    else:
        print("   [Supabase] Credentials missing (SUPABASE_URL/SUPABASE_KEY).")

    print("\n── 1. Loading ingredients ───────────────────────────────────────────")
    if not supabase:
        print("   [Error] Supabase client not initialized. Cannot proceed without database access.")
        return

    print("   > Fetching ingredients from Supabase ('dim_ingredient')...")
    try:
        res = supabase.table("dim_ingredient").select("*").execute()
        ingredients = pd.DataFrame(res.data)
        
        if ingredients.empty:
            print("   [Error] 'dim_ingredient' table is empty in Supabase. Please populate it first.")
            return

        # Map column names if they differ from what the script expects
        # The DB schema uses 'ingredient_search', script uses 'ingredient_search_term'
        if 'ingredient_search' in ingredients.columns and 'ingredient_search_term' not in ingredients.columns:
            ingredients = ingredients.rename(columns={'ingredient_search': 'ingredient_search_term'})
            
        print(f"   > Loaded {len(ingredients)} ingredients from Supabase.")
    except Exception as e:
        print(f"   [Error] Failed to fetch ingredients from Supabase: {e}")
        return
    
    print(f"\n── 2. Loading model: {MODEL_NAME} ──────────────────────────────────")
    model = SentenceTransformer(MODEL_NAME)

    print("\n── 3. Live Search & Processing ──────────────────────────────────────")
    
    mapping_rows = []
    all_found_products = []  # For dim_product and fact_productprice
    
    for i, (_, ing) in enumerate(ingredients.iterrows()):
        # Build query
        search_term = ing.get('ingredient_search_term')
        query = normalizar(str(search_term)) if pd.notna(search_term) else clean_brands(normalizar(ing['ingredient_name']))
        
        if not query: continue
            
        print(f"   [{i+1}/{len(ingredients)}] '{query}'...", end="", flush=True)
        search_results = search_products(query)
        
        candidates_data = []
        for store in search_results:
            sid = get_supermarket_id(store["catalog"])
            for p in store["products"]:
                weight, unit = extract_quantity_and_unit(p.get("quantity"))
                candidates_data.append({
                    "product_id": p["id"],
                    "product_name": p["name"],
                    "product_brand": p["brand"],
                    "weight": weight,
                    "product_quant_unit": unit,
                    "supermarket_id": sid,
                    "price": clean_price(p["regularPrice"]),
                    "campaign_price": clean_price(p["campaignPrice"]),
                    "price_per_unit": clean_price(p["pricePerQuantity"]),
                    "date": p["date"],
                    "productUrl": p.get("productUrl"),
                    "name_norm": clean_brands(normalizar(p["name"]))
                })
        
        if not candidates_data:
            print(" 0 found.")
            continue

        candidates = pd.DataFrame(candidates_data)
        
        # Scoring
        query_emb = model.encode([query], convert_to_numpy=True)
        prod_embs = model.encode(candidates['product_name'].tolist(), convert_to_numpy=True)
        candidates['semantic_score'] = cosine_similarity(query_emb, prod_embs)[0]
        candidates['fuzzy_score'] = candidates['name_norm'].apply(lambda x: fuzz.token_set_ratio(query, x) / 100.0)
        candidates['final_score'] = (candidates['semantic_score'] * 0.7 + candidates['fuzzy_score'] * 0.3)
        
        # Best matches above gate
        best_matches = (
            candidates[candidates['final_score'] >= args.quality_gate]
            .sort_values('final_score', ascending=False)
            .drop_duplicates('supermarket_id')
        )
        
        for _, match in best_matches.iterrows():
            # Data for the mapping table
            mapping_rows.append({
                'ingredient_id': ing['ingredient_id'],
                'product_id':    match['product_id'],
                'final_score':   round(float(match['final_score']), 4)
            })
            
            # Data for fact_productprice (MUST include ingredient_id)
            match_dict = match.to_dict()
            match_dict['ingredient_id'] = ing['ingredient_id']
            all_found_products.append(match_dict)
            
        print(f" {len(best_matches)} matches.")
        time.sleep(0.3)

    # ── 4. Sync to Supabase ───────────────────────────────────────────────────
    if supabase and all_found_products:
        print("\n── 4. Syncing to Supabase ──────────────────────────────────────────")
        df_sync = pd.DataFrame(all_found_products)
        
        # Utility to make DF JSON-compliant
        def to_json_ready(df):
            return df.astype(object).where(pd.notna(df), None).to_dict(orient="records")

        # A. Dim_Product
        dim_prod = df_sync[["product_id", "product_name", "product_brand", "weight", "product_quant_unit", "productUrl"]].drop_duplicates()
        dim_prod = dim_prod.rename(columns={"productUrl": "product_url"})
        supabase.table("dim_product").upsert(to_json_ready(dim_prod)).execute()
        print("   > dim_product synced.")

        # B. Fact_ProductPrice
        # Usar a data do dia em que o script corre (data de extração)
        df_sync["price_date"] = pd.Timestamp.today().strftime('%Y-%m-%d')
        
        fact_rows = df_sync[[
            "product_id", "supermarket_id", "price_date", "price", "campaign_price", "price_per_unit", "ingredient_id"
        ]].dropna(subset=["product_id", "supermarket_id", "price_date", "ingredient_id"])
        
        # Ensure we don't violate the unique constraint
        fact_rows = fact_rows.drop_duplicates(subset=["product_id", "supermarket_id", "price_date"])

        # Safety check: Verify that all ingredient_ids exist in dim_ingredient to avoid FK violations
        existing_ing_ids = set(ingredients['ingredient_id'].unique())
        fact_rows = fact_rows[fact_rows['ingredient_id'].isin(existing_ing_ids)]
        
        if not fact_rows.empty:
            supabase.table("fact_productprice").upsert(to_json_ready(fact_rows)).execute()
            print("   > fact_productprice synced.")
        else:
            print("   > fact_productprice skipped (no valid rows).")

        # D. Mapping Table (Local CSV only)
        print("   > Mapping table skipped")

    # Save local CSV
    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    mapping_df = pd.DataFrame(mapping_rows)
    if not mapping_df.empty:
        mapping_df = mapping_df.drop_duplicates(subset=['ingredient_id', 'product_id'])
    
    mapping_df.to_csv(output_path, index=False)
    print(f"\nDone. Saved mapping to {output_path}")
    print(f"Total time: {time.time() - t_global:.1f}s")

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output',       default=DEFAULT_OUT_PATH)
    parser.add_argument('--quality-gate', type=float, default=QUALITY_GATE)
    return parser.parse_args()

if __name__ == "__main__":
    main(parse_args())

"""
pipeline.py
-----------
Pipeline unificado em 3 fases:

  Fase 1 — Ingredient Matching
    Pesquisa por ingredient_search_term (dim_ingredient), faz scoring
    semântico + fuzzy e sincroniza com dim_product + fact_productprice
    (com ingredient_id preenchido).

  Fase 2 — Broad Catalog Fetch
    Pesquisa por queries genéricas para popular o catálogo de produtos
    disponíveis para o utilizador explorar. Insere em dim_product +
    fact_productprice com ingredient_id = NULL.

  Fase 3 — Nutrition Scraping
    Para cada produto em dim_product com product_url preenchido mas
    energy_kcal a NULL, faz scraping da tabela nutricional.

Uso:
    python pipeline.py                         # corre as 3 fases
    python pipeline.py --skip-catalog          # só matching + nutrição
    python pipeline.py --skip-nutrition        # só matching + catálogo
    python pipeline.py --only-nutrition        # só fase 3
    python pipeline.py --quality-gate 0.65     # threshold de matching
"""

import argparse
import os
import re
import time
import unicodedata

import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pathlib import Path
from rapidfuzz import fuzz
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client

load_dotenv()

# ── Configuração ───────────────────────────────────────────────────────────────

SEARCH_API_URL = "https://content-api.prices-crawler.duckdns.org/api/v1/products/search"
MODEL_NAME     = "paraphrase-multilingual-MiniLM-L12-v2"
QUALITY_GATE   = 0.55

URL_SB = os.environ.get("SUPABASE_URL")
KEY_SB = os.environ.get("SUPABASE_KEY")

# Catálogos usados no matching de ingredientes (os 2 principais)
CATALOGS_MATCH = [
    "pt.continente",
    "pt.pingo-doce",
]

# Catálogos usados no fetch de catálogo alargado
CATALOGS_ALL = [
    "pt.continente",
    "pt.pingo-doce",
    "pt.auchan",
    "pt.minipreco",
]

SUPERMARKET_MAP = {
    "continente": 1,
    "pingo-doce":  2,
    "minipreco":   3,
    "auchan":      4,
}

BRANDS = [
    "pingo doce", "continente", "auchan", "minipreco", "mini preco",
    "pura vida", "seara", "nobre", "intermarche", "lidl", "mercadona",
    "el corte ingles", "jumbo", "dia", "bom dia",
]

# Queries genéricas para popular o catálogo (Fase 2)
CATALOG_QUERIES = [
    # proteínas animais
    "frango", "peru", "carne", "atum", "salmão", "ovos",
    "tamboril", "linguado", "lula", "bacalhau", "mexilhão", "amêijoa",
    "bacon", "chourição", "borrego",
    # hidratos / base
    "arroz", "massa", "batata", "pão", "farinha", "aveia",
    # laticínios
    "leite", "queijo", "iogurte", "manteiga", "natas",
    # legumes
    "tomate", "cebola", "cenoura", "alho", "brocolos", "espinafres",
    "pimento", "curgete", "couve-flor", "beringela", "cogumelos",
    "alface", "pepino", "espargos", "beterraba",
    "feijão", "grão-de-bico", "ervilhas", "chalota", "abóbora",
    # fruta
    "banana", "maçã", "laranja", "manga", "abacate", "kiwi",
    "melancia", "melão", "mirtilo", "lima", "limão", "pera", "tangerina",
    # condimentos / outros
    "azeite", "sal", "pimenta", "molho tomate", "natas", "açúcar",
    "mel", "vinagre", "molho de soja", "mostarda", "tahini",
    "cuscuz", "quinoa",
    "canela", "curcuma", "paprika", "colorau", "carril", "cominhos",
]


# ── Helpers de texto ───────────────────────────────────────────────────────────

def normalizar(texto: str) -> str:
    if not isinstance(texto, str):
        return ""
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    texto = texto.lower()
    texto = re.sub(r"[-/]", " ", texto)
    texto = re.sub(r"\d+[\.,]?\d*\s*(kg|g|ml|l|cl|un|gr)\b", "", texto)
    texto = re.sub(r"[^a-z\s]", "", texto)
    return " ".join(texto.split())


def clean_brands(texto: str) -> str:
    for brand in BRANDS:
        pattern = r"\b" + re.escape(brand) + r"\b"
        texto = re.sub(pattern, "", texto)
    return " ".join(texto.split())


def get_supermarket_id(catalog_str: str) -> int:
    s = catalog_str.lower()
    for name, sid in SUPERMARKET_MAP.items():
        if name in s:
            return sid
    return 0


def clean_price(x):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().replace("€", "").replace(",", ".")
    s = re.sub(r"[^\d\.]", "", s)
    if s.count(".") > 1:
        parts = s.split(".")
        s = parts[0] + "." + "".join(parts[1:])
    s = s.rstrip(".")
    try:
        return float(s) if s else None
    except ValueError:
        return None


def extract_quantity_and_unit(qty_str):
    if not qty_str or (isinstance(qty_str, float) and np.isnan(qty_str)):
        return None, None
    s = str(qty_str).lower().replace(",", ".")
    num_match = re.search(r"(\d+(?:\.\d+)?)", s)
    weight = float(num_match.group(1)) if num_match else None
    unit = None
    if re.search(r"\b(kg|quilos?)\b", s):       unit = "kg"
    elif re.search(r"\b(g|gr|gramas?)\b", s):   unit = "g"
    elif re.search(r"\b(l|lt|lts|litros?)\b", s): unit = "l"
    elif re.search(r"\b(ml|mililitros?)\b", s): unit = "ml"
    elif re.search(r"\b(cl|centilitros?)\b", s): unit = "cl"
    elif re.search(r"\b(un|unidades?)\b", s):   unit = "un"
    if unit is None and weight is not None:
        unit = re.sub(r"[^a-zA-Z]", "", s.replace("emb", "")).strip() or None
    return weight, unit


def to_json_ready(df: pd.DataFrame) -> list:
    """Converte DataFrame para lista de dicts JSON-safe (NaN → None)."""
    return df.astype(object).where(pd.notna(df), None).to_dict(orient="records")


# ── API ────────────────────────────────────────────────────────────────────────

def search_products(query: str, catalogs: list) -> list:
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://prices-crawler.vercel.app",
        "User-Agent": "Mozilla/5.0",
    }
    payload = {"query": query, "catalogs": catalogs}
    try:
        r = requests.post(SEARCH_API_URL, json=payload, headers=headers, timeout=15)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"   [API Error] {e}")
    return []


def parse_api_products(search_results: list, ingredient_id=None) -> list:
    """
    Converte resultados da API numa lista de dicts prontos para usar.
    ingredient_id é opcional — se None, produto é de catálogo genérico.
    """
    rows = []
    for store in search_results:
        sid = get_supermarket_id(store["catalog"])
        for p in store["products"]:
            weight, unit = extract_quantity_and_unit(p.get("quantity"))
            rows.append({
                "product_id":       p["id"],
                "product_name":     p["name"],
                "product_brand":    p.get("brand"),
                "weight":           weight,
                "product_quant_unit": unit,
                "supermarket_id":   sid,
                "price":            clean_price(p.get("regularPrice")),
                "campaign_price":   clean_price(p.get("campaignPrice")),
                "price_per_unit":   clean_price(p.get("pricePerQuantity")),
                "price_date":       pd.Timestamp.today().strftime("%Y-%m-%d"),
                "product_url":      p.get("productUrl"),
                "ingredient_id":    ingredient_id,
                # campo auxiliar para scoring
                "name_norm":        clean_brands(normalizar(p["name"])),
            })
    return rows


def sync_dim_product(supabase, products: list):
    """Insert em dim_product garantindo que não há duplicados."""
    if not products:
        return
    df = pd.DataFrame(products)
    cols = ["product_id", "product_name", "product_brand", "weight",
            "product_quant_unit", "product_url"]
    dim = df[cols].drop_duplicates(subset=["product_id"])
    
    # 1ª PARTE: Verificação do product_id na dim_product
    res_existing_products = supabase.table("dim_product").select("product_id").execute()
    existing_product_ids = {row["product_id"] for row in res_existing_products.data} if res_existing_products.data else set()
    
    dim_new = dim[~dim["product_id"].isin(existing_product_ids)]
    
    if not dim_new.empty:
        supabase.table("dim_product").insert(to_json_ready(dim_new)).execute()
        print(f"   > dim_product: {len(dim_new)} produtos novos inseridos.")
    else:
        print("   > dim_product: Nenhum produto novo a inserir.")


def sync_fact_productprice(supabase, products: list):
    """Insert em fact_productprice garantindo que não há duplicados."""
    if not products:
        return
    df = pd.DataFrame(products)
    cols = ["product_id", "supermarket_id", "price_date",
            "price", "campaign_price", "price_per_unit", "ingredient_id"]
    fact = (
        df[cols]
        .dropna(subset=["product_id", "supermarket_id", "price_date"])
        .drop_duplicates(subset=["product_id", "supermarket_id", "price_date"])
    ) 
    supabase.table("fact_productprice").upsert(to_json_ready(fact)).execute()
    print(f"   > fact_productprice: {len(fact)} preços sincronizados.")

# ── Fase 1 — Ingredient Matching ──────────────────────────────────────────────

def fase1_ingredient_matching(supabase, model, quality_gate: float):
    print("\n━━ FASE 1 — Ingredient Matching ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Carregar ingredientes
    res = supabase.table("dim_ingredient").select("*").execute()
    ingredients = pd.DataFrame(res.data)
    if ingredients.empty:
        print("   [Aviso] dim_ingredient está vazia. A saltar Fase 1.")
        return

    if "ingredient_search" in ingredients.columns and "ingredient_search_term" not in ingredients.columns:
        ingredients = ingredients.rename(columns={"ingredient_search": "ingredient_search_term"})

    print(f"   > {len(ingredients)} ingredientes carregados.")

    all_products = []
    matched = 0

    for i, (_, ing) in enumerate(ingredients.iterrows()):
        search_term = ing.get("ingredient_search_term")
        query = normalizar(str(search_term)) if pd.notna(search_term) \
                else clean_brands(normalizar(ing["ingredient_name"]))
        if not query:
            continue

        print(f"   [{i+1}/{len(ingredients)}] '{query}'...", end="", flush=True)
        results = search_products(query, CATALOGS_MATCH)
        candidates_raw = parse_api_products(results, ingredient_id=ing["ingredient_id"])

        if not candidates_raw:
            print(" 0 encontrados.")
            continue

        candidates = pd.DataFrame(candidates_raw)

        # Scoring semântico + fuzzy
        q_emb   = model.encode([query], convert_to_numpy=True)
        p_embs  = model.encode(candidates["product_name"].tolist(), convert_to_numpy=True)
        candidates["semantic_score"] = cosine_similarity(q_emb, p_embs)[0]
        candidates["fuzzy_score"]    = candidates["name_norm"].apply(
            lambda x: fuzz.token_set_ratio(query, x) / 100.0
        )
        candidates["final_score"] = (
            candidates["semantic_score"] * 0.7 + candidates["fuzzy_score"] * 0.3
        )

        # Melhor match por supermercado acima do quality gate
        """best = (
            candidates[candidates["final_score"] >= quality_gate]
            .sort_values("final_score", ascending=False)
            .drop_duplicates("supermarket_id")
        )"""
        best = (
            candidates[candidates["final_score"] >= quality_gate]
            .sort_values("final_score", ascending=False)
        )

        print(f" {len(best)} matches.")
        all_products.extend(best.to_dict(orient="records"))
        matched += len(best)
        time.sleep(0.3)

    print(f"\n   > Total de matches: {matched}")
    print("   > A sincronizar com Supabase...", end="", flush=True)
    sync_dim_product(supabase, all_products)
    sync_fact_productprice(supabase, all_products)
    print(" ✓")


# ── Fase 2 — Broad Catalog Fetch ──────────────────────────────────────────────

def fase2_catalog_fetch(supabase):
    print("\n━━ FASE 2 — Broad Catalog Fetch ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"   > {len(CATALOG_QUERIES)} queries | {len(CATALOGS_ALL)} catálogos")

    all_products = []

    for i, query in enumerate(CATALOG_QUERIES):
        print(f"   [{i+1}/{len(CATALOG_QUERIES)}] '{query}'...", end="", flush=True)
        results = search_products(query, CATALOGS_ALL)
        # ingredient_id = None  →  produto de catálogo genérico
        products = parse_api_products(results, ingredient_id=None)
        print(f" {len(products)} produtos.")
        all_products.extend(products)
        time.sleep(0.5)

    # Deduplicar por product_id (para dim_product) antes de sincronizar
    df_all = pd.DataFrame(all_products)
    if df_all.empty:
        print("   [Aviso] Nenhum produto encontrado.")
        return

    print(f"\n   > Total de produtos (bruto): {len(df_all)}")
    print(f"   > Produtos únicos (product_id): {df_all['product_id'].nunique()}")
    print("   > A sincronizar com Supabase...", end="", flush=True)

    sync_dim_product(supabase, all_products)
    sync_fact_productprice(supabase, all_products)
    print(" ✓")


# ── Fase 3 — Nutrition Scraping ───────────────────────────────────────────────

def parse_continente(html: str) -> dict:
    data = {}
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.find_all("div", class_="nutrients-row")
    print(f"   [DEBUG] {len(rows)} rows | in html: {'nutrients-row' in html}")  # ← aqui

    for row in soup.find_all("div", class_="nutrients-row"):
        cells = row.find_all("div", class_="nutriInfo-details")
        if len(cells) < 3:
            continue
        name    = cells[0].get_text(strip=True).lower()
        val_str = cells[1].get_text(strip=True).replace(",", ".")
        unit    = cells[2].get_text(strip=True).lower()
        try:
            val = float(val_str)
        except ValueError:
            continue
        if "energia" in name and "quilocaloria" in unit: data["energy_kcal"] = val
        elif "energia" in name and "quilojoule" in unit: data["energy_kj"]   = val
        elif name == "lípidos":                          data["fats"]         = val
        elif name == "hidratos de carbono":              data["carbohydrates"]= val
        elif name == "proteínas":                        data["protein"]      = val
    return data


def parse_pingodoce(html: str) -> dict:
    data = {}
    soup  = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="nutrition-table")
    if not table:
        return data
    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) != 2:
            continue
        name    = tds[0].get_text(strip=True).lower()
        val_str = tds[1].get_text(strip=True).replace(",", ".")
        try:
            val = float(val_str)
        except ValueError:
            continue
        if "energia (kcal)" in name:                            data["energy_kcal"]  = val
        elif "energia (kj)" in name:                           data["energy_kj"]    = val
        elif name == "lípidos (g)":                            data["fats"]         = val
        elif name == "hidratos de carbono (g)":                data["carbohydrates"]= val
        elif name in ("proteínas (g)", "proteínas"):           data["protein"]      = val
    return data


def scrape_nutrition(url: str) -> dict | None:
    headers = {"User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/100.0.4896.127 Safari/537.36"
    )}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        #print(f"   [DEBUG] status={r.status_code} url={url[:50]}") 
        if r.status_code != 200:
            return None
        if "continente.pt" in url:
            # Passo 1: extrair o data-url do endpoint de nutrição
            soup = BeautifulSoup(r.text, "html.parser")
            anchor = soup.find("a", class_="js-nutritional-tab-anchor")
            if not anchor or not anchor.get("data-url"):
                return None
            nutri_url = anchor["data-url"]

            # Passo 2: chamar o endpoint de nutrição
            r2 = requests.get(nutri_url, headers=headers, timeout=10)
            if r2.status_code != 200:
                return None
            return parse_continente(r2.text)
        # if "continente.pt" in url:
        #    return parse_continente(r.text)
        
        elif "pingodoce.pt" in url:
            return None
            #return parse_pingodoce(r.text)
    except Exception as e:
        print(f"   [Erro scraping] {e}")
    return None


def fase3_nutrition_scraping(supabase):
    print("\n━━ FASE 3 — Nutrition Scraping ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Buscar TODOS os produtos com paginação (limite Supabase = 1000/query)
    products = []
    page_size = 1000
    offset = 0
    while True:
        res = (
            supabase.table("dim_product")
            .select("product_id, product_url")
            .is_("energy_kcal", "null")
            .neq("product_url", "null")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data
        if not batch:
            break
        products.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    if not products:
        print("   > Nenhum produto pendente de scraping.")
        return

    print(f"   > {len(products)} produtos para extrair nutrição.")
    ok, fail = 0, 0

    for i, prod in enumerate(products):
        pid = prod["product_id"]
        url = prod["product_url"]
        print(f"   [{i+1}/{len(products)}] {pid}...", end=" ", flush=True)

        nutrition = scrape_nutrition(url)

        if nutrition:
            supabase.table("dim_product").update(nutrition).eq("product_id", pid).execute()
            print(f"✓ {nutrition}")
            ok += 1
        else:
            print("✗ sem dados")
            fail += 1

        time.sleep(1)

    print(f"\n   > Scraping concluído: {ok} ok | {fail} sem dados")


# ── Entry point ────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Pipeline: matching + catálogo + nutrição")
    p.add_argument("--quality-gate",    type=float, default=QUALITY_GATE,
                   help=f"Threshold de matching (default: {QUALITY_GATE})")
    p.add_argument("--skip-ingredients", action="store_true",
                   help="Saltar Fase 1 (ingredient matching)")
    p.add_argument("--skip-catalog",     action="store_true",
                   help="Saltar Fase 2 (broad catalog fetch)")
    p.add_argument("--skip-nutrition",   action="store_true",
                   help="Saltar Fase 3 (nutrition scraping)")
    p.add_argument("--only-nutrition",   action="store_true",
                   help="Correr apenas Fase 3")
    return p.parse_args()


def main():
    args = parse_args()
    t0   = time.time()

    # ── Supabase ──────────────────────────────────────────────────────────────
    if not URL_SB or not KEY_SB:
        print("[Erro] Credenciais Supabase em falta (SUPABASE_URL / SUPABASE_KEY).")
        return
    try:
        supabase = create_client(URL_SB, KEY_SB)
        supabase.table("dim_ingredient").select("ingredient_id").limit(1).execute()
        print("[Supabase] Conexão verificada.")
    except Exception as e:
        print(f"[Erro Supabase] {e}")
        return

    # ── Modelo (carregado uma vez) ────────────────────────────────────────────
    model = None
    needs_model = not args.only_nutrition and not args.skip_ingredients
    if needs_model:
        print(f"\n[Modelo] A carregar '{MODEL_NAME}'...")
        model = SentenceTransformer(MODEL_NAME)

    # ── Fases ─────────────────────────────────────────────────────────────────
    if args.only_nutrition:
        fase3_nutrition_scraping(supabase)
    else:
        if not args.skip_ingredients:
            fase1_ingredient_matching(supabase, model, args.quality_gate)
        if not args.skip_catalog:
            fase2_catalog_fetch(supabase)
        if not args.skip_nutrition:
            fase3_nutrition_scraping(supabase)

    print(f"\n✅ Pipeline concluído em {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
import os
import time
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

URL_SB = os.environ.get("SUPABASE_URL")
KEY_SB = os.environ.get("SUPABASE_KEY")

def parse_continente(html):
    data = {}
    soup = BeautifulSoup(html, 'html.parser')
    rows = soup.find_all('div', class_='nutrients-row')
    print(f"   [DEBUG] {len(rows)} rows | 'nutrients-row' in html: {'nutrients-row' in html}")
    for row in rows:
        cells = row.find_all('div', class_='nutriInfo-details')
        if len(cells) >= 3:
            name = cells[0].get_text(strip=True).lower()
            val_str = cells[1].get_text(strip=True).replace(',', '.')
            unit = cells[2].get_text(strip=True).lower()
            
            try:
                val = float(val_str)
            except ValueError:
                continue
                
            if 'energia' in name and 'quilocaloria' in unit:
                data['energy_kcal'] = val
            elif 'energia' in name and 'quilojoule' in unit:
                data['energy_kj'] = val
            elif name == 'lípidos':
                data['fats'] = val
            elif name == 'hidratos de carbono':
                data['carbohydrates'] = val
            elif name == 'proteínas':
                data['protein'] = val
    return data

def parse_pingodoce(html):
    data = {}
    soup = BeautifulSoup(html, 'html.parser')
    table = soup.find('table', class_='nutrition-table')
    if not table: return data
    
    for tr in table.find_all('tr'):
        tds = tr.find_all('td')
        if len(tds) == 2:
            name = tds[0].get_text(strip=True).lower()
            val_str = tds[1].get_text(strip=True).replace(',', '.')
            
            try:
                val = float(val_str)
            except ValueError:
                continue
            
            if 'energia (kcal)' in name:
                data['energy_kcal'] = val
            elif 'energia (kj)' in name:
                data['energy_kj'] = val
            elif name == 'lípidos (g)':
                data['fats'] = val
            elif name == 'hidratos de carbono (g)':
                data['carbohydrates'] = val
            elif name == 'proteínas (g)' or name == 'proteínas':
                data['protein'] = val
    return data

def scrape_product_nutrition(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return None
            
        html = response.text
        if 'continente.pt' in url:
            return parse_continente(html)
        elif 'pingodoce.pt' in url:
            return parse_pingodoce(html)
    except Exception as e:
        print(f"Error scraping {url}: {e}")
    return None

def main():
    if not URL_SB or not KEY_SB:
        print("Missing Supabase credentials in .env")
        return

    supabase = create_client(URL_SB, KEY_SB)
    
    # Busca produtos que TÊM URL mas AINDA NÃO TÊM energia preenchida
    res = supabase.table("dim_product").select("product_id, product_url").is_("energy_kcal", "null").neq("product_url", "null").execute()
    products = res.data

    if not products:
        print("Nenhum produto pendente de scraping encontrado.")
        return

    print(f"Encontrados {len(products)} produtos para extrair tabela nutricional.")
    
    for i, prod in enumerate(products):
        pid = prod['product_id']
        url = prod['product_url']
        
        print(f"[{i+1}/{len(products)}] Fazendo scraping a: {pid}...", end=" ")
        
        nutrition_data = scrape_product_nutrition(url)
        
        if nutrition_data and len(nutrition_data) > 0:
            # Faz Update na DB
            supabase.table("dim_product").update(nutrition_data).eq("product_id", pid).execute()
            print(f"Sucesso! Encontrado: {nutrition_data}")
        else:
            print("Falhou ou não tem informação nutricional.")
            
        # Pequena pausa para evitar ser bloqueado pelos sites (Soft Ban)
        time.sleep(1)

if __name__ == "__main__":
    main()

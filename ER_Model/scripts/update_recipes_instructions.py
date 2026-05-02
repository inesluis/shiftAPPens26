import os
from pathlib import Path
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

def main():
    print("A carregar variáveis de ambiente...")
    
    # Resolve dinamicamente os caminhos quer chames dentro da pasta ou fora
    base_path = Path(__file__).parent.parent.parent
    env_path = base_path / 'ER_Model' / 'scripts' / '.env'
    csv_path = base_path / 'ER_Model' / 'data' / 'dim_recipe.csv'
    
    load_dotenv(env_path)

    URL_SB = os.environ.get('SUPABASE_URL')
    KEY_SB = os.environ.get('SUPABASE_KEY')

    if not URL_SB or not KEY_SB:
        print(f"Erro: Credenciais Supabase não encontradas em {env_path}")
        return

    print("A conectar ao Supabase...")
    supabase = create_client(URL_SB, KEY_SB)

    print(f"A ler o ficheiro CSV: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path, sep=';', encoding='utf-8')
    except Exception as e:
        print(f"Erro ao ler o ficheiro: {e}")
        return

    print(f"Encontradas {len(df)} receitas. A iniciar atualização das instruções...")
    
    sucesso = 0
    erros = 0

    for index, row in df.iterrows():
        # Certifica-te se o nome da coluna no CSV corresponde
        recipe_id = row['recipe_id']
        instructions = row['instructions']

        if pd.notna(instructions):
            try:
                # Faz o update apenas da coluna de instruções para a receita específica
                supabase.table("dim_recipe").update({"instructions": str(instructions)}).eq("recipe_id", recipe_id).execute()
                print(f"Receita {recipe_id} adicionada.")
                sucesso += 1
            except Exception as e:
                print(f"Falha ao atualizar receita {recipe_id}: {e}")
                erros += 1

    print("\n--- Relatório Final ---")
    print(f"Atualizadas com sucesso: {sucesso}")
    print(f"Falhas: {erros}")

if __name__ == "__main__":
    main()

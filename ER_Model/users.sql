CREATE TABLE public.dim_user (
  user_id uuid NOT NULL, -- Ligado automaticamente ao ID gerado pelo Supabase Auth
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying UNIQUE NOT NULL,
  
  -- Características do Utilizador
  age integer,
  weight_kg double precision, -- Peso em kg
  height_cm double precision, -- Altura em cm
  budget double precision, -- Orçamento disponível
  
  -- BMI calculado automaticamente: weight_kg / ((height_cm / 100) ^ 2)
  bmi double precision GENERATED ALWAYS AS (
    CASE 
      WHEN weight_kg IS NOT NULL AND height_cm IS NOT NULL AND height_cm > 0 
      THEN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::numeric, 2)::double precision
      ELSE NULL 
    END
  ) STORED,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dim_user_pkey PRIMARY KEY (user_id),
  CONSTRAINT dim_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de Objetivos e Metas de Macronutrientes do Utilizador
CREATE TABLE public.dim_user_goals (
  user_goal_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  
  -- Modo/Objetivo escolhido pelo utilizador
  goal_mode character varying NOT NULL, -- 'muscle_gain', 'fat_loss', 'maintenance', 'performance'
  
  -- Metas de Macros para este objetivo
  target_calories double precision NOT NULL, -- Calorias alvo diárias
  target_protein_g double precision NOT NULL, -- Proteína em gramas
  target_carbs_g double precision NOT NULL, -- Carboidratos em gramas
  target_fats_g double precision NOT NULL, -- Gorduras em gramas
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dim_user_goals_pkey PRIMARY KEY (user_goal_id),
  CONSTRAINT dim_user_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.dim_user(user_id) ON DELETE CASCADE,
  CONSTRAINT valid_goal_mode CHECK (goal_mode IN ('muscle_gain', 'fat_loss', 'maintenance', 'performance'))
);

CREATE TABLE public.fact_user_recipe (
  user_recipe_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  recipe_name character varying NOT NULL,
  
  -- Instruções da Receita
  instructions text, -- Instruções/modo de preparação
  
  -- Totais Nutricionais Calculados
  total_energy_kj double precision DEFAULT 0,
  total_energy_kcal double precision DEFAULT 0,
  total_fats double precision DEFAULT 0,
  total_carbohydrates double precision DEFAULT 0,
  total_protein double precision DEFAULT 0,
  
  -- Totais de Custo Calculados
  total_cost double precision DEFAULT 0,
  cheapest_total_cost double precision DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fact_user_recipe_pkey PRIMARY KEY (user_recipe_id),
  CONSTRAINT fact_user_recipe_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.dim_user(user_id) ON DELETE CASCADE
);

CREATE TABLE public.fact_user_recipe_product (
  user_recipe_product_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_recipe_id bigint NOT NULL,
  product_id text NOT NULL,        -- O produto que ele pesquisou/selecionou
  quantity_used double precision,  -- A quantidade usada pelo utilizador (ex: 200)
  quantity_unit character varying, -- A unidade (ex: 'g' ou 'ml')
  
  CONSTRAINT fact_user_recipe_product_pkey PRIMARY KEY (user_recipe_product_id),
  CONSTRAINT f_urp_recipe_id_fkey FOREIGN KEY (user_recipe_id) REFERENCES public.fact_user_recipe(user_recipe_id) ON DELETE CASCADE,
  CONSTRAINT f_urp_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.dim_product(product_id)
);
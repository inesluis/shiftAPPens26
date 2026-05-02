CREATE TABLE public.dim_user (
  user_id uuid NOT NULL, -- Ligado automaticamente ao ID gerado pelo Supabase Auth
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dim_user_pkey PRIMARY KEY (user_id),
  CONSTRAINT dim_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.fact_user_recipe (
  user_recipe_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  recipe_name character varying NOT NULL,
  
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
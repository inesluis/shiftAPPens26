-- Criação das tabelas de dimensão (sem dependências)
CREATE TABLE public.dim_diet (
  diet_id bigint NOT NULL,
  diet_label character varying,
  diet_category character varying,
  CONSTRAINT dim_diet_pkey PRIMARY KEY (diet_id)
);

CREATE TABLE public.dim_ingredient (
  ingredient_id bigint NOT NULL,
  ingredient_name text,
  ingredient_search_term text, 
  CONSTRAINT dim_ingredient_pkey PRIMARY KEY (ingredient_id)
);

CREATE TABLE public.dim_product (
  product_id text NOT NULL,
  product_name character varying,
  product_brand character varying,
  product_quant_unit character varying,
  weight double precision,
  product_url text,
  -- Novas colunas nutricionais adicionadas:
  energy_kcal double precision,
  energy_kj double precision,
  fats double precision,
  carbohydrates double precision,
  protein double precision,
  CONSTRAINT dim_product_pkey PRIMARY KEY (product_id)
);

CREATE TABLE public.dim_recipe (
  recipe_id bigint NOT NULL,
  recipe_name character varying,
  cuisine_type character varying, 
  nutritional_value double precision,
  protein double precision,
  carbs double precision,
  fat double precision,
  fiber double precision,
  CONSTRAINT dim_recipe_pkey PRIMARY KEY (recipe_id)
);

CREATE TABLE public.dim_supermarket (
  supermarket_id bigint NOT NULL,
  supermarket_name character varying,
  CONSTRAINT dim_supermarket_pkey PRIMARY KEY (supermarket_id)
);

CREATE TABLE public.dim_userpersona (
  persona_id bigint NOT NULL,
  persona_label character varying,
  age_min smallint,
  age_max smallint,
  weight_min double precision,
  weight_max double precision,
  height_min double precision,
  height_max double precision,
  calories_ref double precision,
  protein_ref double precision,
  carbs_ref double precision,
  fat_ref double precision,
  fiber_ref double precision,
  CONSTRAINT dim_userpersona_pkey PRIMARY KEY (persona_id)
);

-- Criação das tabelas de factos (com dependências/Foreign Keys)
CREATE TABLE public.fact_productprice (
  product_price_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id text,
  supermarket_id bigint,
  price_date date,
  price double precision,         -- O preço deve ficar aqui!
  campaign_price double precision,
  price_per_unit double precision,
  ingredient_id bigint,
  CONSTRAINT fact_productprice_pkey PRIMARY KEY (product_price_id),
  CONSTRAINT fact_productprice_supermarket_id_fkey FOREIGN KEY (supermarket_id) REFERENCES public.dim_supermarket(supermarket_id),
  CONSTRAINT fact_productprice_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.dim_product(product_id),
  CONSTRAINT fact_productprice_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.dim_ingredient(ingredient_id)
);

CREATE TABLE public.fact_recipeingredient (
  recipe_ingredient_id bigint NOT NULL,
  recipe_id bigint,
  ingredient_id bigint,
  diet_id bigint,
  ingredient_quantity text,
  CONSTRAINT fact_recipeingredient_pkey PRIMARY KEY (recipe_ingredient_id),
  CONSTRAINT fact_recipeingredient_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.dim_recipe(recipe_id),
  CONSTRAINT fact_recipeingredient_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.dim_ingredient(ingredient_id),
  CONSTRAINT fact_recipeingredient_diet_id_fkey FOREIGN KEY (diet_id) REFERENCES public.dim_diet(diet_id)
);
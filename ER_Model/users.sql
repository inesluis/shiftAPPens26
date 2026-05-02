-- ============================================================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABELA DIM_USER - Perfil do Utilizador
-- ============================================================================
CREATE TABLE public.dim_user (
  user_id uuid NOT NULL PRIMARY KEY,
  
  -- Ligado automaticamente ao ID gerado pelo Supabase Auth
  email character varying NOT NULL, -- Copiado de auth.users, não precisa de ser UNIQUE aqui
  first_name character varying,     -- Inicialmente NULL, preenchido depois pelo utilizador
  last_name character varying,      -- Inicialmente NULL, preenchido depois pelo utilizador
  active_goal_mode character varying DEFAULT 'muscle_gain',
  
  -- Características do Utilizador
  age integer,
  weight_kg double precision,       -- Peso em kg
  height_cm double precision,       -- Altura em cm
  budget double precision,          -- Orçamento disponível
  
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
  
  CONSTRAINT dim_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT dim_user_active_goal_mode_check CHECK (active_goal_mode IS NULL OR active_goal_mode IN ('muscle_gain', 'fat_loss', 'maintenance', 'performance'))
);

-- Trigger para atualizar updated_at
CREATE TRIGGER dim_user_update_updated_at
  BEFORE UPDATE ON public.dim_user
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FUNÇÃO PARA CRIAR UTILIZADOR EM DIM_USER QUANDO SE REGISTA EM AUTH
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.dim_user (user_id, email, active_goal_mode)
  VALUES (NEW.id, NEW.email, 'muscle_gain');

  INSERT INTO public.dim_user_goals (user_id, goal_mode, target_calories, target_protein_g, target_carbs_g, target_fats_g)
  VALUES
    (NEW.id, 'muscle_gain', 0, 0, 0, 0),
    (NEW.id, 'fat_loss', 0, 0, 0, 0),
    (NEW.id, 'maintenance', 0, 0, 0, 0),
    (NEW.id, 'performance', 0, 0, 0, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger que chama a função quando novo user em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNÇÃO PARA DEFINIR O GOAL ATIVO E GUARDAR OS VALORES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_user_goal(
  p_user_id uuid,
  p_goal_mode character varying,
  p_calories double precision,
  p_protein_g double precision,
  p_carbs_g double precision,
  p_fats_g double precision
)
RETURNS void AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.dim_user_goals
  SET
    target_calories = p_calories,
    target_protein_g = p_protein_g,
    target_carbs_g = p_carbs_g,
    target_fats_g = p_fats_g,
    updated_at = now()
  WHERE user_id = p_user_id
    AND goal_mode = p_goal_mode;

  UPDATE public.dim_user
  SET
    active_goal_mode = p_goal_mode,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- TABELA DIM_USER_GOALS - Objetivos e Metas de Macronutrientes
-- ============================================================================
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
  CONSTRAINT valid_goal_mode CHECK (goal_mode IN ('muscle_gain', 'fat_loss', 'maintenance', 'performance')),
  CONSTRAINT one_goal_row_per_mode UNIQUE (user_id, goal_mode)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER dim_user_goals_update_updated_at
  BEFORE UPDATE ON public.dim_user_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT fact_user_recipe_pkey PRIMARY KEY (user_recipe_id),
  CONSTRAINT fact_user_recipe_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.dim_user(user_id) ON DELETE CASCADE
);

-- Trigger para atualizar updated_at
CREATE TRIGGER fact_user_recipe_update_updated_at
  BEFORE UPDATE ON public.fact_user_recipe
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Segurança de Dados
-- ============================================================================
-- Ativar RLS nas tabelas do utilizador
ALTER TABLE public.dim_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_user_recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_user_recipe_product ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DIM_USER - Políticas RLS
-- ============================================================================
-- Utilizadores podem só ver o seu próprio perfil
CREATE POLICY "Utilizadores veem próprio perfil"
  ON public.dim_user FOR SELECT
  USING (auth.uid() = user_id);

-- Utilizadores podem atualizar o seu próprio perfil
CREATE POLICY "Utilizadores atualizam próprio perfil"
  ON public.dim_user FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DIM_USER_GOALS - Políticas RLS
-- ============================================================================
-- Utilizadores veem os seus próprios objetivos
CREATE POLICY "Utilizadores veem próprios objetivos"
  ON public.dim_user_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Utilizadores criam objetivos para si
CREATE POLICY "Utilizadores criam próprios objetivos"
  ON public.dim_user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Utilizadores atualizam os seus objetivos
CREATE POLICY "Utilizadores atualizam próprios objetivos"
  ON public.dim_user_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Utilizadores deletam os seus objetivos
CREATE POLICY "Utilizadores deletam próprios objetivos"
  ON public.dim_user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FACT_USER_RECIPE - Políticas RLS
-- ============================================================================
-- Utilizadores veem as suas próprias receitas
CREATE POLICY "Utilizadores veem próprias receitas"
  ON public.fact_user_recipe FOR SELECT
  USING (auth.uid() = user_id);

-- Utilizadores criam receitas
CREATE POLICY "Utilizadores criam receitas"
  ON public.fact_user_recipe FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Utilizadores atualizam as suas receitas
CREATE POLICY "Utilizadores atualizam próprias receitas"
  ON public.fact_user_recipe FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Utilizadores deletam as suas receitas
CREATE POLICY "Utilizadores deletam próprias receitas"
  ON public.fact_user_recipe FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FACT_USER_RECIPE_PRODUCT - Políticas RLS
-- ============================================================================
-- Utilizadores veem produtos nas suas receitas
CREATE POLICY "Utilizadores veem produtos próprias receitas"
  ON public.fact_user_recipe_product FOR SELECT
  USING (user_recipe_id IN (
    SELECT user_recipe_id FROM public.fact_user_recipe 
    WHERE auth.uid() = user_id
  ));

-- Utilizadores adicionam produtos nas suas receitas
CREATE POLICY "Utilizadores adicionam produtos receitas"
  ON public.fact_user_recipe_product FOR INSERT
  WITH CHECK (user_recipe_id IN (
    SELECT user_recipe_id FROM public.fact_user_recipe 
    WHERE auth.uid() = user_id
  ));

-- Utilizadores atualizam produtos
CREATE POLICY "Utilizadores atualizam produtos receitas"
  ON public.fact_user_recipe_product FOR UPDATE
  USING (user_recipe_id IN (
    SELECT user_recipe_id FROM public.fact_user_recipe 
    WHERE auth.uid() = user_id
  ))
  WITH CHECK (user_recipe_id IN (
    SELECT user_recipe_id FROM public.fact_user_recipe 
    WHERE auth.uid() = user_id
  ));

-- Utilizadores deletam produtos
CREATE POLICY "Utilizadores deletam produtos receitas"
  ON public.fact_user_recipe_product FOR DELETE
  USING (user_recipe_id IN (
    SELECT user_recipe_id FROM public.fact_user_recipe 
    WHERE auth.uid() = user_id
  ));
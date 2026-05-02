WITH recipe_ingredients AS (
    SELECT DISTINCT
        fp.ingredient_id
    FROM fact_user_recipe_product urp
    JOIN fact_productprice fp 
        ON fp.product_id = urp.product_id
    WHERE urp.user_recipe_id = :user_recipe_id
),

latest_prices AS (
    SELECT fp.*
    FROM fact_productprice fp
    WHERE fp.price_date = (
        SELECT MAX(fp2.price_date)
        FROM fact_productprice fp2
        WHERE fp2.product_id = fp.product_id
    )
),

cheapest_product_per_ingredient_supermarket AS (
    SELECT
        lp.ingredient_id,
        lp.supermarket_id,
        MIN(
            COALESCE(lp.campaign_price, lp.price)
        ) AS cheapest_product_price
    FROM latest_prices lp
    WHERE lp.ingredient_id IN (
        SELECT ingredient_id FROM recipe_ingredients
    )
    GROUP BY lp.ingredient_id, lp.supermarket_id
)

SELECT
    s.supermarket_name,
    ROUND(SUM(c.cheapest_product_price)::numeric, 2) AS total_cost
FROM cheapest_product_per_ingredient_supermarket c
JOIN dim_supermarket s 
    ON s.supermarket_id = c.supermarket_id
GROUP BY s.supermarket_name
ORDER BY total_cost ASC;
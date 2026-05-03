package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.dto.RecipeCostResponse;
import org.example.jakartapp.util.JpaUtil;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class RecipeCostRepository {

    private EntityManager createEntityManager() {
        EntityManagerFactory entityManagerFactory = JpaUtil.getEntityManagerFactory();
        return entityManagerFactory.createEntityManager();
    }

    public List<RecipeCostResponse> findUserCostsByRecipeId(Long userRecipeId) {
        EntityManager entityManager = createEntityManager();
        try {
            String sql = """
                    WITH user_recipe_products AS (
                        SELECT product_id, quantity_used, quantity_unit
                        FROM fact_user_recipe_product
                        WHERE user_recipe_id = ?1
                    ),
                    product_ingredient_map AS (
                        -- Map specific products back to generic ingredients
                        SELECT DISTINCT product_id, ingredient_id
                        FROM fact_productprice
                        WHERE product_id IN (SELECT product_id FROM user_recipe_products)
                    ),
                    latest_prices AS (
                        SELECT fp.*
                        FROM fact_productprice fp
                        JOIN (
                            SELECT ingredient_id, supermarket_id, MAX(price_date) AS max_price_date
                            FROM fact_productprice
                            GROUP BY ingredient_id, supermarket_id
                        ) latest
                          ON latest.ingredient_id = fp.ingredient_id
                         AND latest.supermarket_id = fp.supermarket_id
                         AND latest.max_price_date = fp.price_date
                    ),
                    cheapest_per_ingredient_supermarket AS (
                        SELECT
                            lp.ingredient_id,
                            lp.supermarket_id,
                            -- Use price per unit (usually per kg) for accurate weight-based calculation
                            MIN(COALESCE(lp.price_per_unit, (COALESCE(lp.campaign_price, lp.price) / NULLIF(dp.weight, 0)) * 1000)) AS price_per_kg
                        FROM latest_prices lp
                        JOIN dim_product dp ON lp.product_id = dp.product_id
                        WHERE lp.ingredient_id IN (SELECT ingredient_id FROM product_ingredient_map)
                        GROUP BY lp.ingredient_id, lp.supermarket_id
                    )
                    SELECT
                        s.supermarket_id,
                        s.supermarket_name,
                        ROUND(COALESCE(SUM((c.price_per_kg / 1000.0) * (
                            CASE WHEN urp.quantity_unit = 'kg' THEN urp.quantity_used * 1000.0 ELSE urp.quantity_used END
                        )), 0)::numeric, 2) AS total_cost,
                        COUNT(c.price_per_kg) AS matched_ingredients,
                        (SELECT COUNT(*) FROM user_recipe_products) - COUNT(c.price_per_kg) AS missing_ingredients
                    FROM dim_supermarket s
                    CROSS JOIN user_recipe_products urp
                    JOIN product_ingredient_map pim ON urp.product_id = pim.product_id
                    LEFT JOIN cheapest_per_ingredient_supermarket c
                      ON c.supermarket_id = s.supermarket_id
                     AND c.ingredient_id = pim.ingredient_id
                    GROUP BY s.supermarket_id, s.supermarket_name
                    HAVING COUNT(c.price_per_kg) > 0
                    ORDER BY total_cost ASC, missing_ingredients ASC
                    """;

            @SuppressWarnings("unchecked")
            List<Object[]> rows = entityManager.createNativeQuery(sql)
                    .setParameter(1, userRecipeId)
                    .getResultList();

            List<RecipeCostResponse> responses = new ArrayList<>(rows.size());
            for (Object[] row : rows) {
                responses.add(new RecipeCostResponse(
                        toLong(row[0]),
                        row[1] == null ? null : row[1].toString(),
                        toBigDecimal(row[2]),
                        toLong(row[3]),
                        toLong(row[4])
                ));
            }
            return responses;
        } finally {
            entityManager.close();
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }
}
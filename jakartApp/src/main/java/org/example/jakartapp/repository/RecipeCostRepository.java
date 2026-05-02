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

    public List<RecipeCostResponse> findCostsByRecipeId(Long recipeId) {
        EntityManager entityManager = createEntityManager();
        try {
            String sql = """
                    WITH recipe_ingredients AS (
                        SELECT DISTINCT ingredient_id
                        FROM fact_recipeingredient
                        WHERE recipe_id = ?1
                    ),
                    latest_prices AS (
                        SELECT fp.*
                        FROM fact_productprice fp
                        JOIN (
                            SELECT product_id, supermarket_id, ingredient_id, MAX(price_date) AS max_price_date
                            FROM fact_productprice
                            GROUP BY product_id, supermarket_id, ingredient_id
                        ) latest
                          ON latest.product_id = fp.product_id
                         AND latest.supermarket_id = fp.supermarket_id
                         AND latest.ingredient_id = fp.ingredient_id
                         AND latest.max_price_date = fp.price_date
                    ),
                    cheapest_per_ingredient_supermarket AS (
                        SELECT
                            lp.ingredient_id,
                            lp.supermarket_id,
                            MIN(COALESCE(lp.campaign_price, lp.price)) AS ingredient_cost
                        FROM latest_prices lp
                        WHERE lp.ingredient_id IN (SELECT ingredient_id FROM recipe_ingredients)
                          AND COALESCE(lp.campaign_price, lp.price) IS NOT NULL
                        GROUP BY lp.ingredient_id, lp.supermarket_id
                    )
                    SELECT
                        s.supermarket_id,
                        s.supermarket_name,
                        ROUND(COALESCE(SUM(c.ingredient_cost), 0)::numeric, 2) AS total_cost,
                        COUNT(c.ingredient_cost) AS matched_ingredients,
                        COUNT(r.ingredient_id) - COUNT(c.ingredient_cost) AS missing_ingredients
                    FROM dim_supermarket s
                    CROSS JOIN recipe_ingredients r
                    LEFT JOIN cheapest_per_ingredient_supermarket c
                      ON c.supermarket_id = s.supermarket_id
                     AND c.ingredient_id = r.ingredient_id
                    GROUP BY s.supermarket_id, s.supermarket_name
                    HAVING COUNT(c.ingredient_cost) > 0
                    ORDER BY total_cost ASC, missing_ingredients ASC, s.supermarket_name ASC
                    """;

            @SuppressWarnings("unchecked")
            List<Object[]> rows = entityManager.createNativeQuery(sql)
                    .setParameter(1, recipeId)
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

    private EntityManager createEntityManager() {
        EntityManagerFactory entityManagerFactory = JpaUtil.getEntityManagerFactory();
        return entityManagerFactory.createEntityManager();
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
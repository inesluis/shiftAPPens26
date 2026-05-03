package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.dto.RecipeCostResponse;
import org.example.jakartapp.dto.RecipeCostWithProductsResponse;
import org.example.jakartapp.dto.MissingIngredientResponse;
import org.example.jakartapp.dto.PersonalizedRecipeCostResponse;
import org.example.jakartapp.dto.PersonalizedSelectedProductResponse;
import org.example.jakartapp.dto.SelectedProductResponse;
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
                        ((SELECT COUNT(*) FROM recipe_ingredients) - COUNT(c.ingredient_cost)) AS missing_ingredients
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

    public List<RecipeCostWithProductsResponse> findCostsByRecipeIdWithProducts(Long recipeId) {
        EntityManager entityManager = createEntityManager();
        try {
            // First, get the cost aggregation data
            String costSql = """
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
                            lp.product_id,
                            MIN(COALESCE(lp.campaign_price, lp.price)) AS ingredient_cost
                        FROM latest_prices lp
                        WHERE lp.ingredient_id IN (SELECT ingredient_id FROM recipe_ingredients)
                          AND COALESCE(lp.campaign_price, lp.price) IS NOT NULL
                        GROUP BY lp.ingredient_id, lp.supermarket_id, lp.product_id
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
            List<Object[]> costRows = entityManager.createNativeQuery(costSql)
                    .setParameter(1, recipeId)
                    .getResultList();

            List<RecipeCostWithProductsResponse> responses = new ArrayList<>(costRows.size());

            // For each supermarket, get the selected products
            for (Object[] row : costRows) {
                Long supermarketId = toLong(row[0]);
                String supermarketName = row[1] == null ? null : row[1].toString();
                BigDecimal totalCost = toBigDecimal(row[2]);
                Long matchedIngredients = toLong(row[3]);
                Long missingIngredients = toLong(row[4]);

                // Get selected products for this supermarket
                String productsSql = """
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
                        ranked_products AS (
                            SELECT
                                lp.ingredient_id,
                                lp.supermarket_id,
                                dp.product_id,
                                dp.product_name,
                                dp.product_brand,
                                COALESCE(lp.campaign_price, lp.price) AS selected_price,
                                ROW_NUMBER() OVER (PARTITION BY lp.ingredient_id, lp.supermarket_id ORDER BY COALESCE(lp.campaign_price, lp.price) ASC) AS rn
                            FROM latest_prices lp
                            JOIN dim_product dp ON dp.product_id = lp.product_id
                            WHERE lp.ingredient_id IN (SELECT ingredient_id FROM recipe_ingredients)
                              AND lp.supermarket_id = ?2
                              AND COALESCE(lp.campaign_price, lp.price) IS NOT NULL
                        )
                        SELECT
                            ingredient_id,
                            product_name,
                            product_brand,
                            selected_price
                        FROM ranked_products
                        WHERE rn = 1
                        ORDER BY ingredient_id ASC
                        """;

                @SuppressWarnings("unchecked")
                List<Object[]> productRows = entityManager.createNativeQuery(productsSql)
                        .setParameter(1, recipeId)
                        .setParameter(2, supermarketId)
                        .getResultList();

                List<SelectedProductResponse> selectedProducts = new ArrayList<>(productRows.size());
                for (Object[] productRow : productRows) {
                    selectedProducts.add(new SelectedProductResponse(
                            toLong(productRow[0]),
                            productRow[1] == null ? null : productRow[1].toString(),
                            productRow[2] == null ? null : productRow[2].toString(),
                            toBigDecimal(productRow[3])
                    ));
                }

                responses.add(new RecipeCostWithProductsResponse(
                        supermarketId,
                        supermarketName,
                        totalCost,
                        matchedIngredients,
                        missingIngredients,
                        selectedProducts
                ));
            }

            return responses;
        } finally {
            entityManager.close();
        }
    }

    public List<PersonalizedRecipeCostResponse> findCostsByUserRecipeId(Long userRecipeId) {
        EntityManager entityManager = createEntityManager();
        try {
            String ingredientsSql = """
                    WITH recipe_ingredients AS (
                        SELECT DISTINCT
                            fp.ingredient_id,
                            di.ingredient_name
                        FROM fact_user_recipe_product urp
                        JOIN fact_productprice fp
                          ON fp.product_id = urp.product_id
                        LEFT JOIN dim_ingredient di
                          ON di.ingredient_id = fp.ingredient_id
                        WHERE urp.user_recipe_id = ?1
                    )
                    SELECT ingredient_id, ingredient_name
                    FROM recipe_ingredients
                    ORDER BY ingredient_id
                    """;

            @SuppressWarnings("unchecked")
            List<Object[]> ingredientRows = entityManager.createNativeQuery(ingredientsSql)
                    .setParameter(1, userRecipeId)
                    .getResultList();

            List<MissingIngredientResponse> allIngredients = new ArrayList<>(ingredientRows.size());
            for (Object[] ingredientRow : ingredientRows) {
                allIngredients.add(new MissingIngredientResponse(
                        toLong(ingredientRow[0]),
                        ingredientRow[1] == null ? null : ingredientRow[1].toString()
                ));
            }

            if (allIngredients.isEmpty()) {
                return List.of();
            }

            String supermarketsSql = """
                    WITH recipe_ingredients AS (
                        SELECT DISTINCT
                            fp.ingredient_id,
                            di.ingredient_name
                        FROM fact_user_recipe_product urp
                        JOIN fact_productprice fp
                          ON fp.product_id = urp.product_id
                        LEFT JOIN dim_ingredient di
                          ON di.ingredient_id = fp.ingredient_id
                        WHERE urp.user_recipe_id = ?1
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
                    ranked_products AS (
                        SELECT
                            ri.ingredient_id,
                            ri.ingredient_name,
                            lp.supermarket_id,
                            s.supermarket_name,
                            lp.product_id,
                            dp.product_name,
                            dp.product_brand,
                            COALESCE(lp.campaign_price, lp.price) AS selected_price,
                            ROW_NUMBER() OVER (
                                PARTITION BY ri.ingredient_id, lp.supermarket_id
                                ORDER BY COALESCE(lp.campaign_price, lp.price) ASC, dp.product_name ASC, lp.product_id ASC
                            ) AS rn
                        FROM recipe_ingredients ri
                        JOIN latest_prices lp
                          ON lp.ingredient_id = ri.ingredient_id
                        JOIN dim_product dp
                          ON dp.product_id = lp.product_id
                        JOIN dim_supermarket s
                          ON s.supermarket_id = lp.supermarket_id
                        WHERE COALESCE(lp.campaign_price, lp.price) IS NOT NULL
                    )
                    SELECT
                        supermarket_id,
                        supermarket_name,
                        ROUND(COALESCE(SUM(selected_price), 0)::numeric, 2) AS total_cost,
                        COUNT(*) AS matched_ingredients
                    FROM ranked_products
                    WHERE rn = 1
                    GROUP BY supermarket_id, supermarket_name
                    ORDER BY total_cost ASC, supermarket_name ASC
                    """;

            @SuppressWarnings("unchecked")
            List<Object[]> supermarketRows = entityManager.createNativeQuery(supermarketsSql)
                    .setParameter(1, userRecipeId)
                    .getResultList();

            List<PersonalizedRecipeCostResponse> responses = new ArrayList<>(supermarketRows.size());
            for (Object[] supermarketRow : supermarketRows) {
                Long supermarketId = toLong(supermarketRow[0]);
                String supermarketName = supermarketRow[1] == null ? null : supermarketRow[1].toString();
                BigDecimal totalCost = toBigDecimal(supermarketRow[2]);
                Long matchedIngredients = toLong(supermarketRow[3]);

                String selectedProductsSql = """
                        WITH recipe_ingredients AS (
                            SELECT DISTINCT
                                fp.ingredient_id,
                                di.ingredient_name
                            FROM fact_user_recipe_product urp
                            JOIN fact_productprice fp
                              ON fp.product_id = urp.product_id
                            LEFT JOIN dim_ingredient di
                              ON di.ingredient_id = fp.ingredient_id
                            WHERE urp.user_recipe_id = ?1
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
                        ranked_products AS (
                            SELECT
                                ri.ingredient_id,
                                ri.ingredient_name,
                                lp.supermarket_id,
                                lp.product_id,
                                dp.product_name,
                                dp.product_brand,
                                COALESCE(lp.campaign_price, lp.price) AS selected_price,
                                ROW_NUMBER() OVER (
                                    PARTITION BY ri.ingredient_id, lp.supermarket_id
                                    ORDER BY COALESCE(lp.campaign_price, lp.price) ASC, dp.product_name ASC, lp.product_id ASC
                                ) AS rn
                            FROM recipe_ingredients ri
                            JOIN latest_prices lp
                              ON lp.ingredient_id = ri.ingredient_id
                            JOIN dim_product dp
                              ON dp.product_id = lp.product_id
                            WHERE lp.supermarket_id = ?2
                              AND COALESCE(lp.campaign_price, lp.price) IS NOT NULL
                        )
                        SELECT
                            ingredient_id,
                            ingredient_name,
                            product_id,
                            product_name,
                            product_brand,
                            selected_price
                        FROM ranked_products
                        WHERE rn = 1
                        ORDER BY ingredient_id
                        """;

                @SuppressWarnings("unchecked")
                List<Object[]> selectedProductRows = entityManager.createNativeQuery(selectedProductsSql)
                        .setParameter(1, userRecipeId)
                        .setParameter(2, supermarketId)
                        .getResultList();

                List<PersonalizedSelectedProductResponse> selectedProducts = new ArrayList<>(selectedProductRows.size());
                List<Long> matchedIngredientIds = new ArrayList<>(selectedProductRows.size());
                for (Object[] selectedProductRow : selectedProductRows) {
                    Long ingredientId = toLong(selectedProductRow[0]);
                    matchedIngredientIds.add(ingredientId);
                    selectedProducts.add(new PersonalizedSelectedProductResponse(
                            ingredientId,
                            selectedProductRow[1] == null ? null : selectedProductRow[1].toString(),
                            selectedProductRow[2] == null ? null : selectedProductRow[2].toString(),
                            selectedProductRow[3] == null ? null : selectedProductRow[3].toString(),
                            selectedProductRow[4] == null ? null : selectedProductRow[4].toString(),
                            toBigDecimal(selectedProductRow[5])
                    ));
                }

                List<MissingIngredientResponse> missingIngredients = new ArrayList<>();
                for (MissingIngredientResponse ingredient : allIngredients) {
                    if (!matchedIngredientIds.contains(ingredient.ingredientId())) {
                        missingIngredients.add(ingredient);
                    }
                }

                responses.add(new PersonalizedRecipeCostResponse(
                        supermarketId,
                        supermarketName,
                        totalCost,
                        matchedIngredients,
                        (long) missingIngredients.size(),
                        selectedProducts,
                        missingIngredients
                ));
            }

            return responses;
        } finally {
            entityManager.close();
        }
    }
}
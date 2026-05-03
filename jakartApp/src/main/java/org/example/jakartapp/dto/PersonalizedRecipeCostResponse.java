package org.example.jakartapp.dto;

import java.math.BigDecimal;
import java.util.List;

public record PersonalizedRecipeCostResponse(
        Long supermarketId,
        String supermarketName,
        BigDecimal totalCost,
        Long matchedIngredients,
        Long missingIngredientsCount,
        List<PersonalizedSelectedProductResponse> selectedProducts,
        List<MissingIngredientResponse> missingIngredients
) {
}

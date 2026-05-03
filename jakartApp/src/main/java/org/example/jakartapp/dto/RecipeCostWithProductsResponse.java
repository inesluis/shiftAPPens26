package org.example.jakartapp.dto;

import java.math.BigDecimal;
import java.util.List;

public record RecipeCostWithProductsResponse(
        Long supermarketId,
        String supermarketName,
        BigDecimal totalCost,
        Long matchedIngredients,
        Long missingIngredients,
        List<SelectedProductResponse> selectedProducts
) {
}

package org.example.jakartapp.dto;

import java.math.BigDecimal;

public record RecipeCostResponse(
        Long supermarketId,
        String supermarketName,
        BigDecimal totalCost,
        Long matchedIngredients,
        Long missingIngredients
) {
}
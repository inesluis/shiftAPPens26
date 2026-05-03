package org.example.jakartapp.dto;

import java.math.BigDecimal;

public record PersonalizedSelectedProductResponse(
        Long ingredientId,
        String ingredientName,
        String productId,
        String productName,
        String productBrand,
        BigDecimal selectedPrice
) {
}

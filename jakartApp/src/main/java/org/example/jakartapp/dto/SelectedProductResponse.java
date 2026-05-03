package org.example.jakartapp.dto;

import java.math.BigDecimal;

public record SelectedProductResponse(
        Long ingredientId,
        String productName,
        String productBrand,
        BigDecimal selectedPrice
) {
}

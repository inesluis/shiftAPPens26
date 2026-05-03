package org.example.jakartapp.dto;

import java.util.Map;

public record ProductSearchResponse(
    String id,
    String name,
    String productName,
    String brand,
    Map<String, Double> prices,
    Macros macros
) {
    public record Macros(
        Double calories,
        Double protein,
        Double carbs,
        Double fat
    ) {}
}

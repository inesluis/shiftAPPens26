package org.example.jakartapp.dto;

import java.util.List;

public record RecipeResponse(String name, String type, List<String> instructions) {
}

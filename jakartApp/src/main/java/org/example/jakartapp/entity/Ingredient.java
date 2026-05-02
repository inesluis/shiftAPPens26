package org.example.jakartapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dim_ingredient")
public class Ingredient {

    @Id
    @Column(name = "ingredient_id")
    private Long ingredientId;

    @Column(name = "ingredient_name")
    private String ingredientName;

    @Column(name = "ingredient_search_term")
    private String ingredientSearchTerm;

    public Ingredient() {
    }

    public Long getIngredientId() {
        return ingredientId;
    }

    public void setIngredientId(Long ingredientId) {
        this.ingredientId = ingredientId;
    }

    public String getIngredientName() {
        return ingredientName;
    }

    public void setIngredientName(String ingredientName) {
        this.ingredientName = ingredientName;
    }

    public String getIngredientSearchTerm() {
        return ingredientSearchTerm;
    }

    public void setIngredientSearchTerm(String ingredientSearchTerm) {
        this.ingredientSearchTerm = ingredientSearchTerm;
    }
}
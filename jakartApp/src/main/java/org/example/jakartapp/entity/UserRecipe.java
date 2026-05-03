package org.example.jakartapp.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fact_user_recipe", schema = "public")
public class UserRecipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_recipe_id")
    private Long userRecipeId;

    @Column(name = "user_id")
    private String userId; // UUID as String

    @Column(name = "recipe_name")
    private String recipeName;

    @Column(name = "instructions")
    private String instructions;

    @Column(name = "total_energy_kcal")
    private Double totalEnergyKcal;

    @Column(name = "total_protein")
    private Double totalProtein;

    @Column(name = "total_carbohydrates")
    private Double totalCarbohydrates;

    @Column(name = "total_fats")
    private Double totalFats;

    @Column(name = "total_cost")
    private Double totalCost;

    @Column(name = "meal_type")
    private String mealType;

    @Column(name = "diet_type")
    private String dietType;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public UserRecipe() {}

    public Long getUserRecipeId() { return userRecipeId; }
    public void setUserRecipeId(Long userRecipeId) { this.userRecipeId = userRecipeId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getRecipeName() { return recipeName; }
    public void setRecipeName(String recipeName) { this.recipeName = recipeName; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public Double getTotalEnergyKcal() { return totalEnergyKcal; }
    public void setTotalEnergyKcal(Double totalEnergyKcal) { this.totalEnergyKcal = totalEnergyKcal; }

    public Double getTotalProtein() { return totalProtein; }
    public void setTotalProtein(Double totalProtein) { this.totalProtein = totalProtein; }

    public Double getTotalCarbohydrates() { return totalCarbohydrates; }
    public void setTotalCarbohydrates(Double totalCarbohydrates) { this.totalCarbohydrates = totalCarbohydrates; }

    public Double getTotalFats() { return totalFats; }
    public void setTotalFats(Double totalFats) { this.totalFats = totalFats; }

    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }

    public String getMealType() { return mealType; }
    public void setMealType(String mealType) { this.mealType = mealType; }

    public String getDietType() { return dietType; }
    public void setDietType(String dietType) { this.dietType = dietType; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}

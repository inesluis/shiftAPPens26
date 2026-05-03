package org.example.jakartapp.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "fact_user_recipe_product", schema = "public")
public class UserRecipeProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_recipe_product_id")
    private Long userRecipeProductId;

    @Column(name = "user_recipe_id")
    private Long userRecipeId;

    @Column(name = "product_id")
    private String productId;

    @Column(name = "quantity_used")
    private Double quantityUsed;

    @Column(name = "quantity_unit")
    private String quantityUnit;

    @ManyToOne
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;

    public UserRecipeProduct() {}

    public Long getUserRecipeProductId() { return userRecipeProductId; }
    public void setUserRecipeProductId(Long userRecipeProductId) { this.userRecipeProductId = userRecipeProductId; }

    public Long getUserRecipeId() { return userRecipeId; }
    public void setUserRecipeId(Long userRecipeId) { this.userRecipeId = userRecipeId; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public Double getQuantityUsed() { return quantityUsed; }
    public void setQuantityUsed(Double quantityUsed) { this.quantityUsed = quantityUsed; }

    public String getQuantityUnit() { return quantityUnit; }
    public void setQuantityUnit(String quantityUnit) { this.quantityUnit = quantityUnit; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}

package org.example.jakartapp.entity;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "fact_productprice")
public class ProductPrice {

    @Id
    @Column(name = "product_price_id")
    private Long productPriceId;

    @ManyToOne
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;

    @ManyToOne
    @JoinColumn(name = "supermarket_id", insertable = false, updatable = false)
    private Supermarket supermarket;

    @Column(name = "product_id")
    private String productId;

    @Column(name = "supermarket_id")
    private Long supermarketId;

    @Column(name = "price_date")
    private LocalDate priceDate;

    @Column(name = "price")
    private Double price;

    @Column(name = "campaign_price")
    private Double campaignPrice;

    @Column(name = "price_per_unit")
    private Double pricePerUnit;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    public ProductPrice() {
    }

    public Long getProductPriceId() {
        return productPriceId;
    }

    public void setProductPriceId(Long productPriceId) {
        this.productPriceId = productPriceId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Supermarket getSupermarket() {
        return supermarket;
    }

    public void setSupermarket(Supermarket supermarket) {
        this.supermarket = supermarket;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public Long getSupermarketId() {
        return supermarketId;
    }

    public void setSupermarketId(Long supermarketId) {
        this.supermarketId = supermarketId;
    }

    public LocalDate getPriceDate() {
        return priceDate;
    }

    public void setPriceDate(LocalDate priceDate) {
        this.priceDate = priceDate;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Double getCampaignPrice() {
        return campaignPrice;
    }

    public void setCampaignPrice(Double campaignPrice) {
        this.campaignPrice = campaignPrice;
    }

    public Double getPricePerUnit() {
        return pricePerUnit;
    }

    public void setPricePerUnit(Double pricePerUnit) {
        this.pricePerUnit = pricePerUnit;
    }

    public Long getIngredientId() {
        return ingredientId;
    }

    public void setIngredientId(Long ingredientId) {
        this.ingredientId = ingredientId;
    }
}
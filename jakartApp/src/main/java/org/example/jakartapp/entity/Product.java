package org.example.jakartapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dim_product")
public class Product {

    @Id
    @Column(name = "product_id")
    private String productId;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "product_brand")
    private String productBrand;

    @Column(name = "product_quant_unit")
    private String productQuantUnit;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "product_url")
    private String productUrl;

    @Column(name = "energy_kcal")
    private Double energyKcal;

    @Column(name = "energy_kj")
    private Double energyKj;

    @Column(name = "fats")
    private Double fats;

    @Column(name = "carbohydrates")
    private Double carbohydrates;

    @Column(name = "protein")
    private Double protein;

    public Product() {
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductBrand() {
        return productBrand;
    }

    public void setProductBrand(String productBrand) {
        this.productBrand = productBrand;
    }

    public String getProductQuantUnit() {
        return productQuantUnit;
    }

    public void setProductQuantUnit(String productQuantUnit) {
        this.productQuantUnit = productQuantUnit;
    }

    public Double getWeight() {
        return weight;
    }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public String getProductUrl() {
        return productUrl;
    }

    public void setProductUrl(String productUrl) {
        this.productUrl = productUrl;
    }

    public Double getEnergyKcal() {
        return energyKcal;
    }

    public void setEnergyKcal(Double energyKcal) {
        this.energyKcal = energyKcal;
    }

    public Double getEnergyKj() {
        return energyKj;
    }

    public void setEnergyKj(Double energyKj) {
        this.energyKj = energyKj;
    }

    public Double getFats() {
        return fats;
    }

    public void setFats(Double fats) {
        this.fats = fats;
    }

    public Double getCarbohydrates() {
        return carbohydrates;
    }

    public void setCarbohydrates(Double carbohydrates) {
        this.carbohydrates = carbohydrates;
    }

    public Double getProtein() {
        return protein;
    }

    public void setProtein(Double protein) {
        this.protein = protein;
    }
}

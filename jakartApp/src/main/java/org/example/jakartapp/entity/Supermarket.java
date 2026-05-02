package org.example.jakartapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dim_supermarket")
public class Supermarket {

    @Id
    @Column(name = "supermarket_id")
    private Long supermarketId;

    @Column(name = "supermarket_name")
    private String supermarketName;

    public Supermarket() {
    }

    public Long getSupermarketId() {
        return supermarketId;
    }

    public void setSupermarketId(Long supermarketId) {
        this.supermarketId = supermarketId;
    }

    public String getSupermarketName() {
        return supermarketName;
    }

    public void setSupermarketName(String supermarketName) {
        this.supermarketName = supermarketName;
    }
}

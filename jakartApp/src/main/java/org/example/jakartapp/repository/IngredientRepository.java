package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.entity.Ingredient;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class IngredientRepository {

    public List<Ingredient> findAll() {
        EntityManager entityManager = createEntityManager();
        try {
            return entityManager.createQuery(
                            "SELECT i FROM Ingredient i ORDER BY i.ingredientName", Ingredient.class)
                    .getResultList();
        } finally {
            entityManager.close();
        }
    }

    public List<Ingredient> search(String term) {
        if (term == null || term.isBlank()) {
            return findAll();
        }

        String normalizedTerm = "%" + term.trim().toLowerCase() + "%";
        EntityManager entityManager = createEntityManager();
        try {
            return entityManager.createQuery(
                            "SELECT i FROM Ingredient i " +
                                    "WHERE LOWER(COALESCE(i.ingredientName, '')) LIKE :term " +
                                    "OR LOWER(COALESCE(i.ingredientSearchTerm, '')) LIKE :term " +
                                    "ORDER BY i.ingredientName",
                            Ingredient.class)
                    .setParameter("term", normalizedTerm)
                    .getResultList();
        } finally {
            entityManager.close();
        }
    }

    private EntityManager createEntityManager() {
        EntityManagerFactory entityManagerFactory = JpaUtil.getEntityManagerFactory();
        return entityManagerFactory.createEntityManager();
    }
}
package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.entity.Recipe;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class RecipeRepository {

    public List<Recipe> findAll() {
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT r FROM Recipe r ORDER BY r.recipeName", Recipe.class).getResultList();
        } finally {
            em.close();
        }
    }

    public Recipe findById(Long id) {
        EntityManager em = createEntityManager();
        try {
            return em.find(Recipe.class, id);
        } finally {
            em.close();
        }
    }

    public List<Recipe> searchByName(String term) {
        if (term == null || term.isBlank()) return findAll();
        String t = "%" + term.trim().toLowerCase() + "%";
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT r FROM Recipe r WHERE LOWER(COALESCE(r.recipeName,'')) LIKE :t ORDER BY r.recipeName", Recipe.class)
                    .setParameter("t", t)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    private EntityManager createEntityManager() {
        EntityManagerFactory emf = JpaUtil.getEntityManagerFactory();
        return emf.createEntityManager();
    }
}

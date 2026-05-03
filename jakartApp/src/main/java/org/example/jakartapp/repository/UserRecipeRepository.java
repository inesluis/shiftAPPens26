package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;
import org.example.jakartapp.entity.UserRecipe;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class UserRecipeRepository {

    public List<UserRecipe> findByUserId(String userId) {
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT r FROM UserRecipe r WHERE r.userId = :userId", UserRecipe.class)
                    .setParameter("userId", userId)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    public UserRecipe save(UserRecipe recipe) {
        EntityManager em = createEntityManager();
        EntityTransaction tx = em.getTransaction();
        try {
            tx.begin();
            if (recipe.getUserRecipeId() == null) {
                em.persist(recipe);
            } else {
                recipe = em.merge(recipe);
            }
            tx.commit();
            return recipe;
        } catch (Exception e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        } finally {
            em.close();
        }
    }

    public void delete(Long id) {
        EntityManager em = createEntityManager();
        EntityTransaction tx = em.getTransaction();
        try {
            tx.begin();
            UserRecipe r = em.find(UserRecipe.class, id);
            if (r != null) em.remove(r);
            tx.commit();
        } catch (Exception e) {
            if (tx.isActive()) tx.rollback();
            throw e;
        } finally {
            em.close();
        }
    }

    public UserRecipe findById(Long id) {
        EntityManager em = createEntityManager();
        try {
            return em.find(UserRecipe.class, id);
        } finally {
            em.close();
        }
    }

    private EntityManager createEntityManager() {
        EntityManagerFactory emf = JpaUtil.getEntityManagerFactory();
        return emf.createEntityManager();
    }
}

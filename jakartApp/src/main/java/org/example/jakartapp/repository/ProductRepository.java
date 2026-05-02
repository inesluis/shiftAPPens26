package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.entity.Product;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class ProductRepository {

    public List<Product> findAll() {
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT p FROM Product p ORDER BY p.productName", Product.class).getResultList();
        } finally {
            em.close();
        }
    }

    public List<Product> searchByName(String term) {
        if (term == null || term.isBlank()) return findAll();
        String t = "%" + term.trim().toLowerCase() + "%";
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT p FROM Product p WHERE LOWER(COALESCE(p.productName,'')) LIKE :t ORDER BY p.productName", Product.class)
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

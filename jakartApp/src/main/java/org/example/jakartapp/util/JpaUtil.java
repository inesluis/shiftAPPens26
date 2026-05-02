package org.example.jakartapp.util;

import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

public final class JpaUtil {
    private static final String PERSISTENCE_UNIT_NAME = "shiftappensPU";
    private static final Properties props = new Properties();

    static {
        try (InputStream input = JpaUtil.class.getClassLoader().getResourceAsStream("db.properties")) {
            if (input == null) {
                throw new RuntimeException("db.properties not found in classpath");
            }
            props.load(input);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load db.properties", e);
        }
    }

    private static final EntityManagerFactory entityManagerFactory = createEntityManagerFactory();

    private JpaUtil() {
    }

    public static EntityManagerFactory getEntityManagerFactory() {
        return entityManagerFactory;
    }

    private static EntityManagerFactory createEntityManagerFactory() {
        Map<String, Object> jpaProperties = new HashMap<>();
        jpaProperties.put("jakarta.persistence.jdbc.url", props.getProperty("db.url"));
        jpaProperties.put("jakarta.persistence.jdbc.user", props.getProperty("db.user"));
        jpaProperties.put("jakarta.persistence.jdbc.password", props.getProperty("db.password"));
        jpaProperties.put("jakarta.persistence.jdbc.driver", "org.postgresql.Driver");
        jpaProperties.put("eclipselink.ddl-generation", "none");
        jpaProperties.put("eclipselink.logging.level", "WARNING");
        return Persistence.createEntityManagerFactory(PERSISTENCE_UNIT_NAME, jpaProperties);
    }
}
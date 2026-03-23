package com.salaryinsights.repository;

import com.salaryinsights.entity.PageViewDaily;
import com.salaryinsights.entity.PageViewDailyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PageViewDailyRepository extends JpaRepository<PageViewDaily, PageViewDailyId> {

    /** Total views + unique sessions per page for a date range — for dashboard */
    @Query("""
        SELECT p.page, SUM(p.views), SUM(p.uniqueSessions)
        FROM PageViewDaily p
        WHERE p.date BETWEEN :from AND :to
        GROUP BY p.page
        ORDER BY SUM(p.views) DESC
        """)
    List<Object[]> sumByPageBetween(
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to
    );

    /** Daily totals across all pages — for the trend chart */
    @Query("""
        SELECT p.date, SUM(p.views), SUM(p.uniqueSessions)
        FROM PageViewDaily p
        WHERE p.date BETWEEN :from AND :to
        GROUP BY p.date
        ORDER BY p.date ASC
        """)
    List<Object[]> dailyTotalsBetween(
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to
    );

    /** UPSERT a single (page, date) counter — increment atomically */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = """
        INSERT INTO page_view_daily (page, date, views, unique_sessions)
        VALUES (:page, :date, :views, :uniqueSessions)
        ON CONFLICT (page, date) DO UPDATE
          SET views            = page_view_daily.views            + EXCLUDED.views,
              unique_sessions  = page_view_daily.unique_sessions  + EXCLUDED.unique_sessions
        """, nativeQuery = true)
    void upsertCounts(
            @Param("page")           String    page,
            @Param("date")           LocalDate date,
            @Param("views")          long      views,
            @Param("uniqueSessions") long      uniqueSessions
    );
}

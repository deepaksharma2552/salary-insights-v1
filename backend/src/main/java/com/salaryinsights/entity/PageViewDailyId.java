package com.salaryinsights.entity;

import lombok.*;
import java.io.Serializable;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class PageViewDailyId implements Serializable {
    private String page;
    private LocalDate date;
}

package com.salaryinsights.mapper;

import com.salaryinsights.dto.response.CompanyLevelResponse;
import com.salaryinsights.dto.response.StandardizedLevelResponse;
import com.salaryinsights.entity.CompanyLevel;
import com.salaryinsights.entity.LevelMapping;
import com.salaryinsights.entity.StandardizedLevel;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface LevelMapper {

    StandardizedLevelResponse toStandardizedResponse(StandardizedLevel level);

    @Mapping(target = "companyId", source = "company.id")
    @Mapping(target = "companyName", source = "company.name")
    @Mapping(target = "standardizedLevelId", expression = "java(resolveStdId(companyLevel))")
    @Mapping(target = "standardizedLevelName", expression = "java(resolveStdName(companyLevel))")
    @Mapping(target = "hierarchyRank", expression = "java(resolveHierarchyRank(companyLevel))")
    CompanyLevelResponse toCompanyLevelResponse(CompanyLevel companyLevel);

    default java.util.UUID resolveStdId(CompanyLevel cl) {
        if (cl.getLevelMapping() == null) return null;
        return cl.getLevelMapping().getStandardizedLevel() != null
                ? cl.getLevelMapping().getStandardizedLevel().getId() : null;
    }

    default String resolveStdName(CompanyLevel cl) {
        if (cl.getLevelMapping() == null) return null;
        StandardizedLevel sl = cl.getLevelMapping().getStandardizedLevel();
        return sl != null ? sl.getName() : null;
    }

    default Integer resolveHierarchyRank(CompanyLevel cl) {
        if (cl.getLevelMapping() == null) return null;
        StandardizedLevel sl = cl.getLevelMapping().getStandardizedLevel();
        return sl != null ? sl.getHierarchyRank() : null;
    }
}

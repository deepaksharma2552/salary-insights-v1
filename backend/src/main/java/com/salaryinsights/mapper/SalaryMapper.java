package com.salaryinsights.mapper;

import com.salaryinsights.dto.request.SalaryRequest;
import com.salaryinsights.dto.response.SalaryResponse;
import com.salaryinsights.entity.SalaryEntry;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface SalaryMapper {

    @Mapping(target = "companyId",         source = "company.id")
    @Mapping(target = "companyName",        source = "company.name")
    @Mapping(target = "logoUrl",            source = "company.logoUrl")
    @Mapping(target = "website",            source = "company.website")
    @Mapping(target = "standardizedLevelName", source = "standardizedLevel.name")
    @Mapping(target = "submittedByEmail",   source = "submittedBy.email")
    @Mapping(target = "jobFunctionId",      source = "jobFunction.id")
    @Mapping(target = "jobFunctionName",    source = "jobFunction.displayName")
    @Mapping(target = "functionLevelId",    source = "functionLevel.id")
    @Mapping(target = "functionLevelName",  source = "functionLevel.name")
    SalaryResponse toResponse(SalaryEntry entry);

    @Mapping(target = "id",               ignore = true)
    @Mapping(target = "createdAt",        ignore = true)
    @Mapping(target = "updatedAt",        ignore = true)
    @Mapping(target = "company",          ignore = true)
    @Mapping(target = "submittedBy",      ignore = true)
    @Mapping(target = "standardizedLevel", ignore = true)
    @Mapping(target = "reviewStatus",     ignore = true)
    @Mapping(target = "rejectionReason",  ignore = true)
    @Mapping(target = "totalCompensation", ignore = true)
    @Mapping(target = "jobFunction",      ignore = true)
    @Mapping(target = "functionLevel",    ignore = true)
    SalaryEntry toEntity(SalaryRequest request);
}

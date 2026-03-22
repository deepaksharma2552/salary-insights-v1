package com.salaryinsights.mapper;

import com.salaryinsights.dto.request.CompanyRequest;
import com.salaryinsights.dto.response.BenefitItem;
import com.salaryinsights.dto.response.CompanyResponse;
import com.salaryinsights.entity.Company;
import org.mapstruct.*;

import java.util.ArrayList;
import java.util.List;

@Mapper(componentModel = "spring")
public interface CompanyMapper {

    @Mapping(target = "entryCount",          ignore = true)
    @Mapping(target = "avgBaseSalary",        ignore = true)
    @Mapping(target = "avgTotalCompensation", ignore = true)
    @Mapping(target = "tcMin",               ignore = true)
    @Mapping(target = "tcMax",               ignore = true)
    CompanyResponse toResponse(Company company);

    @Mapping(target = "id",            ignore = true)
    @Mapping(target = "createdAt",     ignore = true)
    @Mapping(target = "updatedAt",     ignore = true)
    @Mapping(target = "status",        constant = "ACTIVE")
    @Mapping(target = "companyLevels", ignore = true)
    @Mapping(target = "salaryEntries", ignore = true)
    @Mapping(target = "tcMin",         ignore = true)
    @Mapping(target = "tcMax",         ignore = true)
    @Mapping(target = "benefits",      expression = "java(request.getBenefits() != null ? request.getBenefits() : new java.util.ArrayList<>())")
    Company toEntity(CompanyRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",            ignore = true)
    @Mapping(target = "createdAt",     ignore = true)
    @Mapping(target = "updatedAt",     ignore = true)
    @Mapping(target = "status",        ignore = true)
    @Mapping(target = "companyLevels", ignore = true)
    @Mapping(target = "salaryEntries", ignore = true)
    @Mapping(target = "tcMin",         ignore = true)
    @Mapping(target = "tcMax",         ignore = true)
    @Mapping(target = "benefits",      expression = "java(request.getBenefits() != null ? request.getBenefits() : null)")
    void updateEntity(@MappingTarget Company company, CompanyRequest request);
}

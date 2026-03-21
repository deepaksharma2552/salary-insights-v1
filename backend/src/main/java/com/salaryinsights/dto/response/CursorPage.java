package com.salaryinsights.dto.response;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.domain.Slice;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Cursor-based pagination response.
 * nextCursor is the createdAt timestamp of the last item — pass it as ?cursor=
 * on the next request. null means no more pages.
 */
@Data @Builder
public class CursorPage<T> {
    private List<T> content;
    private String  nextCursor;  // ISO-8601 timestamp or null
    private boolean hasMore;
    private int     size;

    public static <E, T> CursorPage<T> of(Slice<E> slice, Function<E, T> mapper,
                                           Function<E, String> cursorExtractor) {
        List<T> content = slice.getContent().stream().map(mapper).collect(Collectors.toList());
        String nextCursor = null;
        if (slice.hasNext() && !slice.getContent().isEmpty()) {
            nextCursor = cursorExtractor.apply(
                slice.getContent().get(slice.getContent().size() - 1));
        }
        return CursorPage.<T>builder()
                .content(content)
                .nextCursor(nextCursor)
                .hasMore(slice.hasNext())
                .size(content.size())
                .build();
    }
}

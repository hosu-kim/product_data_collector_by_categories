# Product Data Collector By Categories From API

This TypeScript script is designed to collect product data from an imaginary online market API. It systematically fetches product categories and then retrieves all associated products, handling cases where categories have a large number of items by exploring subcategories.

## Core Functionality

*   **Category Fetching**: Retrieves a list of main product categories from the API.
*   **Product Retrieval**:
    *   For each main category, it attempts to fetch all products.
    *   If the number of products in a main category exceeds the API's single-call limit, the script will then fetch that category's subcategories.
    *   It then processes each subcategory to gather its products.
*   **Data Aggregation**: All collected products are compiled into a single array.
*   **Logging**: The script provides console logs for its progress and any errors encountered.

## How it Works Briefly

1.  The script starts by calling `fetchCategoryList()` to get main categories from `${ BASE_URL }/categories`.
2.  For each `category`, `processCategory()` is called:
    *   It first checks if all products for the category can be fetched in one go (`${ BASE_URL }/products?category={ category.id }`).
    *   If not (i.e., `totalProducts > limit`), it fetches subcategories (`${ BASE_URL }/categories/{ category.id }/subcategories`) and then calls `processSubcategory()` for each.
    *   `processSubcategory()` fetches products for that specific subcategory (`${ BASE_URL }/products?subcategory={ subcategory.id }`).
3.  All products are collected by `collectProductData()` and the `main()` function orchestrates the process, logging the total count.

## Key Considerations

*   **API Structure**: This script assumes a specific API design. The `BASE_URL` and endpoint paths (`/categories`, `/products`, etc.) must align with the target API.
*   **Pagination for Subcategories**: If a subcategory itself contains more products than the API returns in a single call (`totalProducts > limit`), this script currently only fetches the first page of products for that subcategory. Full recursive pagination is not implemented.
*   **Error Handling**: Basic error handling is included. `fetchJSON` checks for HTTP errors. `collectProductData` attempts to return any data collected before an error.
*   **Sequential Execution**: Categories and subcategories are processed sequentially. For very large datasets, consider parallel processing (e.g., with `Promise.all`), keeping API rate limits in mind.

## Author

*   hosu-kim

## License

This project is licensed under the MIT License.

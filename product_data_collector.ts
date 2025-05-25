/*
file: product_data_collector.ts
decription:
created: 2025-05-25 16∶11∶52 UTC
author: hosu-kim
*/

// --- Configuration ---
/**
 * The base URL for an imaginary online market API.
 * All API endpoints will be relative to this URL.
 */
const BASE_URL: string = 'https://onlinemarket.com/api';

// --- Interfaces ---
/**
 * Represents a product category or subcategory.
 */
interface CategoryList {
	id: string;   // Unique identifier for the category
	name: string; // Display name of the category
}

/**
 * Represents a product.
 * The structure is flexible, allowing any properties.
 */
interface Products {
	[key: string]: any; // Allows for any structure for product data
}

/**
 * Represents the data structure returned by API endpoints fetching products
 * for a category or subcategory.
 */
interface CategoryData {
	"totalProducts": number; // Total number of products available in this category/subcategory
	"count": number;         // Actual number of products returned in the current API call
	"limit": number;         // Maximum number of products the API returns per call
	"products": Products[];  // Array of product data
}


// --- Utility Functions ---
/**
 * A generic helper function to fetch data from a URL and parse it as JSON.
 * Handles basic error checking for the HTTP response.
 * @param url The URL to fetch data from.
 * @param errorMessagePrefix A prefix for error messages if the fetch fails.
 * @returns A Promise that resolves to the fetched data of type T.
 * @throws An error if the network response is not ok (e.g., 4xx or 5xx status).
 */
async function fetchJSON<T>(url: string, errorMessagePrefix: string = 'Error fetching data from API'): Promise<T> {
	console.log(`Fetching data from: ${ url }`);
	const response = await fetch(url);
	if (!response.ok) {
		// Attempt to get more detailed error information from the response body
		const errorText = await response.text().catch(() => 'Could not read error response text.');
		throw new Error(`${ errorMessagePrefix } (${ url }): HTTP status ${ response.status }. Response: ${ errorText }`);
	}
	return response.json() as Promise<T>; // Assumes the response will be valid JSON of type T
}

// --- Core Logic Functions ---
/**
 * Fetches the list of main product categories from the API.
 * @returns A Promise that resolves to an array of CategoryList objects.
 * @throws An error if fetching the category list fails, which is then caught and re-thrown by main.
 */
async function fetchCategoryList(): Promise<CategoryList[]> {
	try {
		const url: string = `${ BASE_URL }/categories`;
		const categoryList: CategoryList[] = await fetchJSON<CategoryList[]>(url, 'Failed to fetch category list');
		console.log(`Successfully fetched ${ categoryList.length } categories.`);
		return categoryList;
	} catch (error) {
		// Log the specific error and re-throw it to be handled by the caller (main function)
		console.error(`Error in fetchCategoryList: ${ error }`);
		throw error;
	}
}

/**
 * Processes products for a single subcategory.
 * Fetches products for the given subcategory and adds them to the `allProducts` array.
 * @param subcategory The subcategory to process.
 * @param allProducts The array to which fetched products will be added.
 */
async function processSubcategory(subcategory: CategoryList, allProducts: Products[]): Promise<void> {
	console.log(`Processing subcategory: ${ subcategory.name } (ID: ${ subcategory.id })`);
	const subDataUrl: string = `${ BASE_URL }/products?subcategory=${ subcategory.id }`;

	// Fetch product data for this subcategory
	const subcategoryProductData = await fetchJSON<CategoryData>(subDataUrl, `Failed to fetch products for subcategory ${ subcategory.name }`);

	console.log(`Subcategory ${ subcategory.name }: Total products=${ subcategoryProductData.totalProducts}, Fetched in this call=${ subcategoryProductData.products.length }, API reported count = ${ subcategoryProductData.count }, Limit = ${ subcategoryProductData.limit }`);
	allProducts.push(...subcategoryProductData.products); // Add fetched products to the main list

	// Log whether all products were fetched or if pagination might be needed (though not implemented here)
	if (subcategoryProductData.totalProducts <= subcategoryProductData.limit) {
		console.log(`All data fetched for subcategory ${ subcategory.name }. ${ subcategoryProductData.products.length } products added.`);
	} else {
		// This indicates that the API might have more products than what was returned in this single call.
		// The current logic only fetches the first page of products if totalProducts > limit.
		console.log(`Total products for subcategory ${ subcategory.name } (${ subcategoryProductData.totalProducts }) might exceed call limit (${subcategoryProductData.limit }). Added ${ subcategoryProductData.products.length } products (potentially first page).`);
	}
}

/**
 * Processes products for a single maincategory.
 * If the total products for the category are within the API limit, it fetches them directly.
 * Otherwise, it fetches the list of subcategories and processes each subcategory.
 * @param category The main category to process.
 * @param allProducts The array to which fetched products will be added.
 */
async function processCategory(category: CategoryList, allProducts: Products[]): Promise<void> {
	console.log(`Processing category: ${ category.name } (ID: ${ category.id })`);
	const categoryProductsUrl: string = `${ BASE_URL }/products?category=${ category.id }`;

	// Fetch initial product data for the main category to check totalProducts vs limit
	const responseData = await fetchJSON<CategoryData>(categoryProductsUrl, `Failed to fetch products for category ${ category.name }`);
	const { totalProducts, products, limit, count: apiReportedCount } = responseData;

	console.log(`Category ${ category.name }: TotalProducts=${ totalProducts }, Fetched in this call = ${ products.length }, API reported count = ${ apiReportedCount }, Limit = ${ limit }`);

	if (totalProducts <= limit ) {
		// If total products are within the limit, all products for this category were fetched in the initial call.
		console.log(`All products for ${ category.name } (${ products.length }) fetched directly.`);
		allProducts.push(...products);
	} else {
		// If total products exceed the limit, subcategories need to be processed.
		console.log(`Total products for ${ category.name } (${ totalProducts }) exceed limit (${ limit }). Fetching subcategories.`);
		const subListUrl: string = `${ BASE_URL }/categories/${ category.id }/subcategories`;

		const subcategoryList = await fetchJSON<CategoryList[]>(subListUrl, `Failed to fetch subcategories for ${ category.name }`);
		console.log(`Fetched ${ subcategoryList.length } subcategories for ${ category.name }.`);

		// Process products for each subcategory
		for (const subcategory of subcategoryList) {
			await processSubcategory(subcategory, allProducts);
		}
	}
}

/**
 * Collects all product data based on the provided list of categories.
 * Iterates through each category and calls `processCategory` to fetch its products.
 * @param categoryList The list of categories to fetch products for.
 * @returns an array of all collected products. May return partially collected data or an empty array if an error occurs.
 */
async function collectProductData(categoryList: CategoryList[]): Promise<Products[]> {
	let allProducts: Products[] = [] // Initialize an array to store all products
	try {
		// Process products for each category
		for (const category of categoryList) {
			await processCategory(category, allProducts);
		}
		return allProducts; // Return all collected products
	} catch (error) {
		console.error(`Error during product collection process, returning partially collected or empty data: ${ error }`);
		return []; // Return an empty array in case of error
	}
}

/**
 * Main execution function for the product data collection process.
 * Fetches the list of categories, then collects products for each category,
 * and finally logs the total number of products collected.
 * Handles ciritical errors during the process.
 */
async function main() {
	try {
		console.log('Starting product collection process...'); // Log process start
		const categoryList: CategoryList[] = await fetchCategoryList(); // Fetch category list

		// If no categories are found or an error occurs fetching them, stop processing.
		if (!categoryList || categoryList.length === 0) {
			console.log('No categories found or an error occurred while fetching them. Exiting.');
			return ;
		}

		const products: Products[] = await collectProductData(categoryList); // Collect product data

		console.log(`\nProduct collection process finished. Total products collected: ${ products.length }`); // Log final result
	} catch (error) {
		console.error(`Critical error in main execution: ${ error }. Process stopped.`); // Log critical errors
	}
}

main(); // Execute the main function :)

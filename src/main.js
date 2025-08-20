/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
	// @TODO: Расчет выручки от операции 
	// purchase — это одна из записей в поле items из чека в data.purchase_records
	// _product — это продукт из коллекции data.products
	const { discount, sale_price, quantity } = purchase;
	return sale_price * quantity * (1 - (discount || 0) / 100);
	return +revenue.toFixed(2); // Округление до сотых
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
	// @TODO: Расчет бонуса от позиции в рейтинге
	const { profit } = seller;
	if (index === 0) {
		return seller.profit * 0.15; // для первого места
	} else if (index === 1 || index === 2) {
		return seller.profit * 0.1; // для второго и третьего места
	} else if (index === total - 1) {
		return 0; // 0 для последнего места
	} else {
		return seller.profit * 0.05; // 5% для всех остальных

	}
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
	// @TODO: Проверка входных данных
	if (!data || !Array.isArray(data.sellers) ||
		!Array.isArray(data.products) ||
		!Array.isArray(data.purchase_records) ||
		data.sellers.length === 0 || data.products.length === 0 || data.purchase_records.length === 0) {
		throw new Error('Некорректные входные данные');
	}
	// @TODO: Проверка наличия опций
	const { calculateRevenue, calculateBonus } = options;
	if (!calculateRevenue || !calculateBonus) {
		throw new Error('Не переданы необходимые функции для расчетов');
	}


	// @TODO: Подготовка промежуточных данных для сбора статистики
	const sellerStats = data.sellers.map(seller => ({
		id: seller.id,
		name: `${seller.first_name} ${seller.last_name}`,
		revenue: 0,
		profit: 0,
		sales_count: 0,
		products_sold: {}
	}));


	// @TODO: Индексация продавцов и товаров для быстрого доступа
	const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.id, s]));
	const productIndex = Object.fromEntries(data.products.map(p => [p.sku, p]));

	// @TODO: Расчет выручки и прибыли для каждого продавца
	data.purchase_records.forEach(record => {
		const seller = sellerIndex[record.seller_id];
		if (!seller) return;

		seller.sales_count += 1;

		record.items.forEach(item => {
			const product = productIndex[item.sku];
			if (!product) return;

			const cost = product.purchase_price * item.quantity;
			const revenue = calculateRevenue(item, product);
			const profit = revenue - cost;

			seller.revenue = +(seller.revenue + revenue).toFixed(2);
			seller.profit += profit;


			// Учет проданных товаров
			if (!seller.products_sold[item.sku]) {
				seller.products_sold[item.sku] = 0;
			}
			seller.products_sold[item.sku] += item.quantity;
		});
	});

	// @TODO: Сортировка продавцов по прибыли
	sellerStats.sort((a, b) => b.profit - a.profit);

	// @TODO: Назначение премий на основе ранжирования
	// Формирование топ-10 товаров
	// Расчет бонусов и формирование топ-10 товаров
	sellerStats.forEach((seller, index) => {
		seller.bonus = calculateBonus(index, sellerStats.length, seller);

		// Формирование топ-10 товаров
		seller.top_products = Object.entries(seller.products_sold)
			.map(([sku, quantity]) => ({ sku, quantity }))
			.sort((a, b) => b.quantity - a.quantity)
			.slice(0, 10);
	});

	// Формирование итогового отчета
	return sellerStats.map(seller => ({
		seller_id: seller.id,
		name: seller.name,
		revenue: +seller.revenue.toFixed(2),
		profit: +seller.profit.toFixed(2),
		sales_count: seller.sales_count,
		top_products: seller.top_products,
		bonus: +seller.bonus.toFixed(2)
	}));
}
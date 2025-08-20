/**
 * Функция для расчета выручки
 * @param purchase запись о покупке это одна из записей в поле items из чека в data.purchase_records
 * @param _product карточка товара это продукт из коллекции data.products
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчёт выручки от операции
  // Перевести скидку из процентов в десятичное число: скидка / 100.
  const discount = 1 - (purchase.discount || 0) / 100;
  // выручка = цена продажи * количество * (1 - скидка)
  const revenue = purchase.sale_price * purchase.quantity * discount;
  return +revenue.toFixed(2);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 * 15% — для продавца, который принёс наибольшую прибыль (index === 0)
   10% — для продавцов, которые по прибыли находятся на втором и третьем месте (index === 1 или index === 2)
   5% — для всех остальных продавцов, кроме самого последнего (index === total - 1)
   0% — для продавца на последнем месте.
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  let bonusPercent;
  if (index === 0) {
    bonusPercent = 0.15; // 15%
  } else if (index === 1 || index === 2) {
    bonusPercent = 0.1; // 10%
  } else if (index === total - 1) {
    bonusPercent = 0; // 0%
  } else {
    bonusPercent = 0.05; // 5%
  }
  // бонус в рублях = прибыль * процент
    const bonus = seller.profit * bonusPercent;
    return bonus;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // Здесь проверим входящие данные
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }
  // проверка переданных опций
  const { calculateRevenue, calculateBonus } = options;
  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Не переданы обязательные функции для расчёта в опциях");
  }

  // Здесь посчитаем промежуточные данные и отсортируем продавцов
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0, // Общая выручка продавца
    profit: 0, // Общая прибыль продавца
    sales_count: 0, // Количество чеков (продаж) продавца
    products_sold: {}, // Словарь для учёта проданных товаров: { [sku]: quantity }
  }));

  // индексация продавцов и товаров для быстрого доступа
  // индекс продавцов для быстрого доступа по id
  const sellerIndex = Object.fromEntries(
    sellerStats.map((sellerStat) => [sellerStat.id, sellerStat])
  );
  // индекс товаров для быстрого доступа по sku.
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца
  // Перебираем все чеки (purchase_records)
  data.purchase_records.forEach((record) => {
    // объект статистики для продавца, который оформил этот чек
    const sellerStat = sellerIndex[record.seller_id];
    if (!sellerStat) return;
    // Увеличить количество продаж
    sellerStat.sales_count += 1;
    // Увеличить общую сумму всех продаж
    //  Расчёт прибыли для каждого товара, перебираем все товары в чеке
    
    
    record.items.forEach((item) => {
      // товар в каталоге по артикулу sku
      const product = productIndex[item.sku];
      if (!product) return;
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const itemCost = product.purchase_price * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const itemRevenue = calculateRevenue(item, product);
      // Посчитать прибыль: выручка минус себестоимость
      const itemProfit = itemRevenue - itemCost;
      // Увеличить общую накопленную прибыль (profit) у продавца
      sellerStat.profit += itemProfit;
      sellerStat.revenue = +(sellerStat.revenue + itemRevenue).toFixed(2);

      // Учёт количества проданных товаров
      // Если артикула ещё нет в словаре, инициализируем его нулём
      if (!sellerStat.products_sold[item.sku]) {
        sellerStat.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      sellerStat.products_sold[item.sku] += item.quantity;     
    });
  });

  // Сортируем продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    // Рассчитываем бонус для продавца на основе его позиции (index) в отсортированном массиве
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    // @TODO: Формируем топ-10 проданных товаров для продавца
    // 1. Преобразуем объект products_sold в массив пар [key, value]
    const productsArray = Object.entries(seller.products_sold);
    // 2. Преобразуем массив пар в массив объектов { sku, quantity }
    const productsMapped = productsArray.map(([sku, quantity]) => ({
      sku,
      quantity,
    }));
    // 3. Сортируем массив по quantity по убыванию
    productsMapped.sort((a, b) => b.quantity - a.quantity);
    // 4. Берём первые 10 элементов
    seller.top_products = productsMapped.slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  const result = sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца (округлен в функции)
  }));

  return result;
}



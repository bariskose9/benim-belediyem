/**
 * Market ve restoran ekranlarının ORTAK şekilleri.
 *
 * Neden ortak: iki ekran da "kategoriye süz, metinle ara, kart ızgarası göster"
 * yapıyor. Şekiller ayrı ayrı tanımlansaydı süzgeç şeridi ve arama kutusu da
 * ikişer kez yazılırdı; ikinci kopya birincisiyle zamanla ayrışır.
 *
 * Ürünün KENDİSİ ortak değil ve olmamalı: markette stok sayısı var
 * (`Son 3 adet`), restoranda yalnızca "var/yok" var. Ortaklaştırmak, olmayan
 * bir alanı taşımak için `null` dolu bir tip üretirdi.
 */

/** Süzgeç şeridindeki bir kategori — hem ürün hem menü kategorisi olabilir. */
export type CatalogFilterOption = {
  id: string;
  name: string;
  /** Rozetteki kalem sayısı — boş kategoriye tıklatmamak için. */
  itemCount: number;
};

/** Süzgeç şeridi ve arama kutusunun kullanıcıya gösterdiği metinler. */
export type CatalogSearchCopy = {
  label: string;
  placeholder: string;
  submit: string;
  clear: string;
};

export type CatalogFilterCopy = {
  /** Şeridin ekran okuyucudaki adı. */
  label: string;
  all: string;
  itemCount: (count: number) => string;
};

export type CatalogEmptyCopy = {
  title: string;
  withQuery: (query: string) => string;
  withoutQuery: string;
  reset: string;
};

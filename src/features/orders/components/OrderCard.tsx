import { messages } from "@/config/messages";
import { CancelOrderButton } from "@/features/orders/components/CancelOrderButton";
import { OrderStatusTrack } from "@/features/orders/components/OrderStatusTrack";
import type { OrderView } from "@/features/orders/services/order.service";
import { formatIstanbulDateTime, formatIstanbulTime, toMachineDateTime } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Tek bir siparişin kartı: durum çizgisi, kalemler, tutarlar ve iptal.
 *
 * SUNUCU BİLEŞENİ: durum ve iptal edilebilirlik sunucuda hesaplanıp geliyor
 * (`OrderView`). İstemcide hesaplansaydı tarayıcının saati değiştirilerek
 * "iptal edilebilir" görünen bir düğme elde edilebilirdi — düğme yetki
 * vermez ama kullanıcıyı 409 alacağı bir yola sokmak da kötü bir deneyim.
 */

const copy = messages.orders;

export function OrderCard({ order }: { order: OrderView }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <header className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-semibold tracking-tight">
          {copy.fulfillment[order.fulfillmentType]}
        </h3>
        <p className="text-sm text-muted-foreground">{copy.orderCode(order.code)}</p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={toMachineDateTime(order.createdAt)}>
            {copy.placedAt(formatIstanbulDateTime(order.createdAt))}
          </time>
        </p>
        {order.deliverySlot ? (
          <p className="text-sm text-muted-foreground">{copy.deliverySlot(order.deliverySlot)}</p>
        ) : null}
      </header>

      <OrderStatusTrack status={order.status} />

      {/*
        Bir sonraki aşamanın saati yalnızca sipariş ilerlerken gösteriliyor ve
        metin "tahmini" diyor. Kesin bir saat vaadi, tutulmadığında haklı bir
        şikâyete dönüşürdü (teknik borç #45'in gerekçesiyle aynı).
      */}
      {order.nextStageAt ? (
        <p className="text-sm text-muted-foreground">
          <time dateTime={toMachineDateTime(order.nextStageAt)}>
            {copy.nextStageAt(formatIstanbulTime(order.nextStageAt))}
          </time>
        </p>
      ) : null}

      {order.cancelledAt ? (
        <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            {copy.cancel.cancelledAt(formatIstanbulDateTime(order.cancelledAt))}
          </p>
          {order.refundKurus === null ? null : (
            <p className="text-sm font-medium">
              {copy.cancel.refunded(formatTry(order.refundKurus))}
            </p>
          )}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {order.lines.map((line) => (
          <li
            key={`${line.itemType}:${line.refId}`}
            className="flex justify-between gap-3 text-base"
          >
            <span>
              {line.name}
              <span className="text-muted-foreground"> · {copy.quantity(line.quantity)}</span>
            </span>
            <span className="shrink-0 font-medium">{formatTry(line.lineTotalKurus)}</span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1 border-t border-foreground/10 pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{copy.subtotal}</dt>
          <dd>{formatTry(order.subtotalKurus)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{copy.deliveryFee}</dt>
          <dd>{formatTry(order.deliveryFeeKurus)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-base font-semibold">
          <dt>{copy.total}</dt>
          <dd>{formatTry(order.totalKurus)}</dd>
        </div>
      </dl>

      <footer className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Kart bilgisinden yalnızca son 4 hane — tam numara hiçbir yerde yok. */}
        <p className="text-sm text-muted-foreground">{copy.paidWith(order.cardLast4)}</p>

        <CancelSlot order={order} />
      </footer>
    </article>
  );
}

/**
 * İptal alanı: ya düğme, ya da NEDEN iptal edilemediğini söyleyen açıklama
 * (PRD §5.5: "iptal butonu yalnızca `Alındı` durumundayken görünür;
 * sonrasında yerini açıklama alır").
 *
 * İptal edilmiş ve teslim edilmiş siparişte hiçbir şey yazılmıyor: durum
 * zaten çizgide ve iptal kutusunda görünüyor, "iptal edilemez" demek
 * gereksiz gürültü olurdu.
 */
function CancelSlot({ order }: { order: OrderView }) {
  if (order.canCancel) return <CancelOrderButton orderId={order.id} />;

  if (order.fulfillmentType === "ticket") {
    return <p className="text-sm text-muted-foreground">{messages.orders.cancel.ticketClosed}</p>;
  }

  if (order.status === "preparing" || order.status === "on_the_way") {
    return <p className="text-sm text-muted-foreground">{messages.orders.cancel.closed}</p>;
  }

  return null;
}

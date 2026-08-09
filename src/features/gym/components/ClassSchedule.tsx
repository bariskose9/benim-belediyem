import { messages } from "@/config/messages";
import { GYM_CLASS_SCHEDULE } from "@/features/gym/data/facility";

/**
 * Haftalık grup ders programı (PRD §5.6).
 *
 * ═══ NEDEN TABLO DEĞİL, GÜN GÜN KART ═══
 *
 * 7 sütunlu bir haftalık tablo 375px'te ya taşar ya da okunamayacak kadar
 * küçülür. Gün başlıklı listeler mobilde alt alta, geniş ekranda ızgara
 * olarak diziliyor; ikisinde de tek bir günün dersleri bir arada okunuyor.
 * (`07-ui-design-system.md` → mobile-first.)
 *
 * Derse KAYIT YOK: program yalnızca görüntüleniyor. Bu yüzden hiçbir öğe
 * tıklanabilir değil — tıklanır görünüp hiçbir şey yapmayan bir kart
 * kullanıcıyı yanıltırdı.
 */

const copy = messages.gym.facility;

export function ClassSchedule() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="ders-programi">
      <div className="flex flex-col gap-2">
        <h2 id="ders-programi" className="font-heading text-xl font-semibold tracking-tight">
          {copy.scheduleHeading}
        </h2>
        <p className="max-w-prose text-base text-muted-foreground">{copy.scheduleNote}</p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GYM_CLASS_SCHEDULE.map((day) => (
          <li key={day.id} className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
            <h3 className="text-base font-semibold">{day.day}</h3>

            {day.classes.length === 0 ? (
              <p className="text-base text-muted-foreground">{copy.noClasses}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {day.classes.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5">
                    <span className="text-base font-medium">
                      <span className="tabular-nums">{entry.time}</span> · {entry.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {copy.classDuration(entry.durationMinutes)} · {entry.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Seeds the public provider directory nationwide — doctors in the regional
 * centres and feldshers in the villages, across every region of Kazakhstan.
 * This is the pitch's growth story made real: "Старт — Темиртау и Балхаш.
 * Далее — вся область и регионы."
 *
 * Every provider gets open slots for the next working days so the directory has
 * something bookable to show. Idempotent: re-running updates rather than
 * duplicating.
 *
 * Usage: npx tsx scripts/seed-directory.ts
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

type P = {
  name: string;
  type: "DOCTOR" | "FELDSHER";
  specialty: string;
  clinic: string;
  town: string;
  tele: boolean;
};

/**
 * region -> providers. Each region gets specialists in its centre and at least
 * one feldsher in a smaller town or village — the underserved case the product
 * is built for.
 */
const REGIONS: Record<string, P[]> = {
  "Карагандинская область": [
    { name: "Ержан Тулегенов", type: "DOCTOR", specialty: "Ортопед", clinic: "Городская поликлиника Балхаша", town: "Балхаш", tele: true },
    { name: "Айгуль Сатпаева", type: "DOCTOR", specialty: "Кардиолог", clinic: "Медцентр Жезказган", town: "Жезказган", tele: true },
    { name: "Дмитрий Ким", type: "DOCTOR", specialty: "Невролог", clinic: "Поликлиника №2 Темиртау", town: "Темиртау", tele: true },
    { name: "Марат Ахметов", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "Фельдшерский пункт пос. Агадырь", town: "Агадырь", tele: false },
    { name: "Нурлан Жумабеков", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП Шахтинск", town: "Шахтинск", tele: true },
  ],
  "город Астана": [
    { name: "Асхат Ибраев", type: "DOCTOR", specialty: "Гастроэнтеролог", clinic: "Городская поликлиника №14", town: "Астана", tele: true },
    { name: "Динара Оразова", type: "DOCTOR", specialty: "Эндокринолог", clinic: "Медицинский центр Астаны", town: "Астана", tele: true },
  ],
  "город Алматы": [
    { name: "Тимур Байжанов", type: "DOCTOR", specialty: "Дерматолог", clinic: "Городская клиника Алматы", town: "Алматы", tele: true },
    { name: "Салтанат Ерлан", type: "DOCTOR", specialty: "Офтальмолог", clinic: "Центр микрохирургии глаза", town: "Алматы", tele: false },
  ],
  "город Шымкент": [
    { name: "Бекзат Нуржанов", type: "DOCTOR", specialty: "Уролог", clinic: "Городская больница Шымкента", town: "Шымкент", tele: true },
    { name: "Айнур Досжан", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП пос. Аксукент", town: "Аксукент", tele: false },
  ],
  "Алматинская область": [
    { name: "Ержан Калиев", type: "DOCTOR", specialty: "Хирург", clinic: "Талдыкорганская поликлиника", town: "Талдыкорган", tele: true },
    { name: "Мадина Сериккызы", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП с. Сарканд", town: "Сарканд", tele: false },
  ],
  "Актюбинская область": [
    { name: "Руслан Аманов", type: "DOCTOR", specialty: "Кардиолог", clinic: "Областная больница Актобе", town: "Актобе", tele: true },
    { name: "Гульмира Есенова", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП пос. Кандыагаш", town: "Кандыагаш", tele: false },
  ],
  "Атырауская область": [
    { name: "Данияр Утегенов", type: "DOCTOR", specialty: "Терапевт", clinic: "Поликлиника Атырау", town: "Атырау", tele: true },
    { name: "Асель Кубашева", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП пос. Макат", town: "Макат", tele: false },
  ],
  "Восточно-Казахстанская область": [
    { name: "Виктор Панов", type: "DOCTOR", specialty: "Пульмонолог", clinic: "Больница Усть-Каменогорска", town: "Усть-Каменогорск", tele: true },
    { name: "Айгерим Тлеу", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП с. Глубокое", town: "Глубокое", tele: true },
  ],
  "Жамбылская область": [
    { name: "Нуржан Аскаров", type: "DOCTOR", specialty: "Невролог", clinic: "Городская поликлиника Тараза", town: "Тараз", tele: true },
    { name: "Сауле Бекова", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП с. Мерке", town: "Мерке", tele: false },
  ],
  "Западно-Казахстанская область": [
    { name: "Алмас Хамитов", type: "DOCTOR", specialty: "Эндокринолог", clinic: "Медцентр Уральск", town: "Уральск", tele: true },
    { name: "Жанна Мукашева", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП пос. Аксай", town: "Аксай", tele: false },
  ],
  "Костанайская область": [
    { name: "Олег Резник", type: "DOCTOR", specialty: "Травматолог", clinic: "Областная больница Костаная", town: "Костанай", tele: true },
    { name: "Ляззат Оспан", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП с. Затобольск", town: "Затобольск", tele: false },
  ],
  "Кызылординская область": [
    { name: "Ержан Абдиров", type: "DOCTOR", specialty: "Инфекционист", clinic: "Поликлиника Кызылорды", town: "Кызылорда", tele: true },
    { name: "Гаухар Серик", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП пос. Жалагаш", town: "Жалагаш", tele: false },
  ],
  "Мангистауская область": [
    { name: "Тимур Сагынов", type: "DOCTOR", specialty: "Кардиолог", clinic: "Больница Актау", town: "Актау", tele: true },
    { name: "Аружан Нур", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП пос. Жанаозен", town: "Жанаозен", tele: false },
  ],
  "Павлодарская область": [
    { name: "Сергей Волков", type: "DOCTOR", specialty: "Гастроэнтеролог", clinic: "Поликлиника Павлодара", town: "Павлодар", tele: true },
    { name: "Динара Касым", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП с. Аксу", town: "Аксу", tele: false },
  ],
  "Северо-Казахстанская область": [
    { name: "Андрей Мельник", type: "DOCTOR", specialty: "Терапевт", clinic: "Поликлиника Петропавловска", town: "Петропавловск", tele: true },
    { name: "Камила Ахмет", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП с. Булаево", town: "Булаево", tele: false },
  ],
  "Туркестанская область": [
    { name: "Бахыт Сейдалы", type: "DOCTOR", specialty: "Педиатр", clinic: "Поликлиника Туркестана", town: "Туркестан", tele: true },
    { name: "Айша Нуркен", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП с. Сауран", town: "Сауран", tele: false },
  ],
  "Акмолинская область": [
    { name: "Ольга Ким", type: "DOCTOR", specialty: "Ревматолог", clinic: "Больница Кокшетау", town: "Кокшетау", tele: true },
    { name: "Ерлан Тати", type: "FELDSHER", specialty: "Фельдшер общей практики", clinic: "ФАП пос. Степногорск", town: "Степногорск", tele: false },
  ],
};

function slotDates(): string[] {
  const out: string[] = [];
  const d = new Date();
  let added = 0;
  while (added < 3) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      out.push(d.toISOString().slice(0, 10));
      added++;
    }
  }
  return out;
}
const TIMES = ["09:00", "09:30", "10:00", "11:00", "14:00", "15:30"];

/** Stable, unique email from region + name so re-runs update one record. */
function emailFor(region: string, name: string): string {
  const slug = `${region}-${name}`
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "");
  // Transliterate is overkill for a key; a hash keeps it ASCII-safe and unique.
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `provider.${h.toString(36)}@daryger.kz`;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo123", 10);
  const dates = slotDates();
  let count = 0;
  let feldshers = 0;

  for (const [region, providers] of Object.entries(REGIONS)) {
    for (const p of providers) {
      const email = emailFor(region, p.name);
      const user = await db.user.upsert({
        where: { email },
        create: {
          email,
          password: passwordHash,
          name: p.name,
          role: p.type === "FELDSHER" ? "FELDSHER" : "DOCTOR",
          town: p.town,
        },
        update: { name: p.name, town: p.town, role: p.type === "FELDSHER" ? "FELDSHER" : "DOCTOR" },
      });

      const profile = await db.doctorProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          providerType: p.type,
          specialty: p.specialty,
          clinic: p.clinic,
          town: p.town,
          region,
          offersTelemedicine: p.tele,
          isAvailable: true,
          isVerified: true,
          bio:
            p.type === "FELDSHER"
              ? `${p.clinic}. Публикует расписание приёма — записывайтесь заранее, чтобы не приходить впустую.`
              : `${p.specialty}, ${p.town}. Очный приём${p.tele ? " и телемедицина" : ""}.`,
        },
        update: {
          providerType: p.type,
          specialty: p.specialty,
          clinic: p.clinic,
          town: p.town,
          region,
          offersTelemedicine: p.tele,
        },
      });

      for (const date of dates) {
        for (const time of TIMES) {
          const existing = await db.timeSlot.findFirst({
            where: { doctorId: profile.id, date, time },
          });
          if (!existing) {
            await db.timeSlot.create({ data: { doctorId: profile.id, date, time, isBooked: false } });
          }
        }
      }
      count++;
      if (p.type === "FELDSHER") feldshers++;
    }
  }

  console.log(
    `Directory seeded across ${Object.keys(REGIONS).length} regions: ` +
      `${count} providers (${feldshers} feldshers, ${count - feldshers} doctors).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

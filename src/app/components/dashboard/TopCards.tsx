"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import Link from "next/link";
import CardBox from "../shared/CardBox";

type DashboardCard = {
  title: string;
  value: string;
  image: string;
  href: string;
  color: "info" | "success" | "primary" | "warning" | "secondary" | "error";
};

const cardColors: Record<DashboardCard["color"], { background: string; text: string }> = {
  info: { background: "bg-info/10", text: "text-info" },
  success: { background: "bg-success/10", text: "text-success" },
  primary: { background: "bg-primary/10", text: "text-primary" },
  warning: { background: "bg-warning/10", text: "text-warning" },
  secondary: { background: "bg-secondary/10", text: "text-secondary" },
  error: { background: "bg-error/10", text: "text-error" },
};

const TopCards = ({ cards }: { cards: readonly DashboardCard[] }) => (
  <Swiper
    slidesPerView={6}
    spaceBetween={24}
    loop={cards.length > 6}
    freeMode
    grabCursor
    speed={5000}
    autoplay={{ delay: 0, disableOnInteraction: false }}
    modules={[Autoplay]}
    breakpoints={{
      0: { slidesPerView: 1, spaceBetween: 10 },
      640: { slidesPerView: 2, spaceBetween: 14 },
      768: { slidesPerView: 3, spaceBetween: 18 },
      1030: { slidesPerView: 4, spaceBetween: 18 },
      1200: { slidesPerView: 6, spaceBetween: 24 },
    }}
    className="mySwiper"
  >
    {cards.map((card) => {
      const colors = cardColors[card.color];
      return (
        <SwiperSlide key={card.title}>
          <Link href={card.href}>
            <CardBox
              className={`w-full border-none! shadow-none ${colors.background}`}
            >
              <div className="text-center transition-all ease-in-out hover:scale-105">
                <div className="flex justify-center">
                  <Image
                    src={card.image}
                    width={50}
                    height={50}
                    className="mb-3"
                    alt=""
                  />
                </div>
                <p className={`mb-1 font-semibold ${colors.text}`}>
                  {card.title}
                </p>
                <h5 className={`mb-0 text-lg font-semibold ${colors.text}`}>
                  {card.value}
                </h5>
              </div>
            </CardBox>
          </Link>
        </SwiperSlide>
      );
    })}
  </Swiper>
);

export { TopCards };

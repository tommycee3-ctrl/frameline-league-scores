import type { Metadata } from "next";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Food & Drinks" };

const specials = [
  { day: "MON", title: "League Night Pitcher", detail: "Domestic pitcher during league play", price: "$12" },
  { day: "WED", title: "Wings & Frames", detail: "One dozen wings with any lane rental", price: "$9" },
  { day: "FRI", title: "Cosmic Combo", detail: "Large pizza and pitcher of pop", price: "$24" },
];

const menu = [
  {
    category: "Lane-Side Favorites",
    items: [
      ["Bowlatorium Burger", "Double patty, American cheese, pickles and house sauce", "$11"],
      ["Crispy Chicken Sandwich", "Breaded chicken, lettuce, tomato and ranch", "$10"],
      ["Loaded Nachos", "Cheese, jalapeños, salsa, sour cream and seasoned beef", "$12"],
      ["West Lanes Wings", "Buffalo, barbecue or garlic parmesan · 6 / 12 pieces", "$8 / $14"],
    ],
  },
  {
    category: "Pizza & Shareables",
    items: [
      ["Classic Cheese Pizza", "Golden crust, red sauce and mozzarella", "$14"],
      ["Kingpin Pepperoni", "Double pepperoni and mozzarella", "$17"],
      ["The 7–10 Split", "Sausage, pepperoni, peppers, onions and mushrooms", "$20"],
      ["Pretzel Bites", "Warm salted bites with cheese sauce", "$8"],
    ],
  },
  {
    category: "Snacks & Sides",
    items: [
      ["Basket of Fries", "Classic seasoned fries", "$5"],
      ["Onion Rings", "Crispy battered rings with ranch", "$7"],
      ["Mozzarella Sticks", "Six sticks with marinara", "$8"],
      ["Kids' Chicken Bites", "Chicken bites, fries and a small drink", "$8"],
    ],
  },
  {
    category: "Drinks",
    items: [
      ["Fountain Drinks", "Pepsi products · free refill", "$3"],
      ["Domestic Draft", "Ask about today's tap lineup", "$5"],
      ["Local Craft Draft", "Rotating Omaha-area selection", "$7"],
      ["The Perfect Game", "Bourbon, cherry, citrus and cola", "$9"],
    ],
  },
];

export default function FoodDrinks() {
  return (
    <>
      <PageHeader
        eyebrow="Bites between frames"
        title="Food & Drinks"
        intro="Classic bowling-alley favorites, cold drinks and shareable plates delivered close to the action."
      />

      <section className="section menu-intro">
        <div>
          <p className="eyebrow red">Sample menu preview</p>
          <h2>Never roll hungry.</h2>
        </div>
        <div>
          <p>Grab a quick snack between games, split a pizza with the team, or settle in at the bar after the final frame.</p>
          <p className="sample-note">All menu items, prices and specials below are sample content for website approval and are not currently advertised offers.</p>
        </div>
      </section>

      <section className="specials-band">
        <div className="specials-heading"><p className="eyebrow">Sample weekly specials</p><h2>Something good<br/>is always rolling.</h2></div>
        <div className="specials-grid">
          {specials.map((special) => (
            <article key={special.title}>
              <span>{special.day}</span>
              <div><h3>{special.title}</h3><p>{special.detail}</p></div>
              <strong>{special.price}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section full-menu">
        <div className="section-heading">
          <div><p className="eyebrow red">The lineup</p><h2>Food & bar menu</h2></div>
          <p className="menu-smallprint">Sample items · final menu coming soon</p>
        </div>
        <div className="menu-columns">
          {menu.map((group) => (
            <section className="menu-group" key={group.category}>
              <h3>{group.category}</h3>
              {group.items.map(([name, description, price]) => (
                <article className="menu-item" key={name}>
                  <div><h4>{name}</h4><p>{description}</p></div>
                  <strong>{price}</strong>
                </article>
              ))}
            </section>
          ))}
        </div>
      </section>

      <section className="bar-callout">
        <div className="bar-glass" aria-hidden="true"><i/><i/></div>
        <div><p className="eyebrow">The West Lanes bar</p><h2>Stay for the<br/>last frame.</h2><p>Draft beer, simple cocktails, soft drinks and a comfortable seat to catch the game.</p></div>
      </section>
    </>
  );
}

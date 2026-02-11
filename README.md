# Next.js & HeroUI Template

This is a template for creating applications using Next.js 14 (app directory) and HeroUI (v2).

[Try it on CodeSandbox](https://githubbox.com/heroui-inc/heroui/next-app-template)

## Technologies Used

- [Next.js 14](https://nextjs.org/docs/getting-started)
- [HeroUI v2](https://heroui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Tailwind Variants](https://tailwind-variants.org)
- [TypeScript](https://www.typescriptlang.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [next-themes](https://github.com/pacocoursey/next-themes)

## How to Use

### Use the template with create-next-app

To create a new project based on this template using `create-next-app`, run the following command:

```bash
npx create-next-app -e https://github.com/heroui-inc/next-app-template
```

### Install dependencies

You can use one of them `npm`, `yarn`, `pnpm`, `bun`, Example using `npm`:

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

### Setup pnpm (optional)

If you are using `pnpm`, you need to add the following code to your `.npmrc` file:

```bash
public-hoist-pattern[]=*@heroui/*
```

After modifying the `.npmrc` file, you need to run `pnpm install` again to ensure that the dependencies are installed correctly.

## License

Licensed under the [MIT license](https://github.com/heroui-inc/next-app-template/blob/main/LICENSE).

# I want to improve our scientific understanding of butterflies and moths populations, using all the possible data available. I want this website to be a source for people to learn lepidoptera in the world. 

# this project could be a good addition to iNaturalist 

maybe add an extension that overlays my project with their website

Consider adding an option for user requests


### ADD larval host plants to GIS overlay

# The biggest part of this project will likely be a powerful overlay process to show multiple variables play out like larval host plants and nectar plants. The base visualization of the butterfly population are great and the species level distribution models amazing, but there is more data to use. What else could we add? Perhaps a temperature layer showing changes in temperature over time 

## Add digital elevation model layer

## Can add land type layer (need to simplify)

5. Nectar plant richness/diversity - Harder but valuable:

Could derive from GBIF flowering plant data
Seasonal bloom timing if you want to get fancy
Adult butterfly distribution often correlates more with nectar availability than you'd expect

Layers that would really showcase skills but are optional:

Phenology data - Growing season start/end from MODIS satellite data
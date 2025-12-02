import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksAboutSection extends Struct.ComponentSchema {
  collectionName: 'components_blocks_about_sections';
  info: {
    displayName: 'About Section';
  };
  attributes: {
    aboutText: Schema.Attribute.Text;
    profileImage: Schema.Attribute.Media<'images' | 'files'>;
  };
}

export interface BlocksContactSection extends Struct.ComponentSchema {
  collectionName: 'components_blocks_contact_sections';
  info: {
    displayName: 'Contact Section';
  };
  attributes: {};
}

export interface BlocksHeroSection extends Struct.ComponentSchema {
  collectionName: 'components_blocks_hero_sections';
  info: {
    displayName: 'Hero Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    subtextWords: Schema.Attribute.Component<'elements.subtext', true>;
  };
}

export interface BlocksProjectsSection extends Struct.ComponentSchema {
  collectionName: 'components_blocks_projects_sections';
  info: {
    displayName: 'Projects Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    projectCards: Schema.Attribute.Component<'elements.project-card', true>;
  };
}

export interface BlocksTechnologiesSection extends Struct.ComponentSchema {
  collectionName: 'components_blocks_technologies_sections';
  info: {
    displayName: 'Technologies Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    subheading: Schema.Attribute.String;
    technologyCards: Schema.Attribute.Component<
      'elements.technology-card',
      true
    >;
  };
}

export interface ElementsContactForm extends Struct.ComponentSchema {
  collectionName: 'components_elements_contact_forms';
  info: {
    displayName: 'contactForm';
  };
  attributes: {};
}

export interface ElementsLink extends Struct.ComponentSchema {
  collectionName: 'components_elements_links';
  info: {
    displayName: 'Link';
  };
  attributes: {
    href: Schema.Attribute.String;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    text: Schema.Attribute.String;
  };
}

export interface ElementsLogo extends Struct.ComponentSchema {
  collectionName: 'components_elements_logos';
  info: {
    displayName: 'Logo';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface ElementsNavLink extends Struct.ComponentSchema {
  collectionName: 'components_elements_nav_links';
  info: {
    displayName: 'nav-link';
  };
  attributes: {
    href: Schema.Attribute.String;
    label: Schema.Attribute.String;
    order: Schema.Attribute.Integer;
  };
}

export interface ElementsProjectCard extends Struct.ComponentSchema {
  collectionName: 'components_elements_project_cards';
  info: {
    displayName: 'projectCard';
  };
  attributes: {
    githubLink: Schema.Attribute.Component<'elements.project-link', false>;
    projectDescription: Schema.Attribute.Text;
    projectImage: Schema.Attribute.Media<'files' | 'images'>;
    projectLink: Schema.Attribute.Component<'elements.project-link', false>;
    projectName: Schema.Attribute.String;
    technologies: Schema.Attribute.Component<'elements.technology', true>;
  };
}

export interface ElementsProjectLink extends Struct.ComponentSchema {
  collectionName: 'components_elements_project_links';
  info: {
    displayName: 'projectLink';
  };
  attributes: {
    href: Schema.Attribute.String;
    icon: Schema.Attribute.String;
    text: Schema.Attribute.String;
  };
}

export interface ElementsSubtext extends Struct.ComponentSchema {
  collectionName: 'components_elements_subtexts';
  info: {
    displayName: 'subtext';
  };
  attributes: {
    text: Schema.Attribute.String;
  };
}

export interface ElementsTechnology extends Struct.ComponentSchema {
  collectionName: 'components_elements_technologies';
  info: {
    displayName: 'technology';
  };
  attributes: {
    text: Schema.Attribute.String;
  };
}

export interface ElementsTechnologyCard extends Struct.ComponentSchema {
  collectionName: 'components_elements_technology_cards';
  info: {
    displayName: 'technologyCard';
  };
  attributes: {
    technologies: Schema.Attribute.Component<'elements.technology', true>;
    title: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {};
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.about-section': BlocksAboutSection;
      'blocks.contact-section': BlocksContactSection;
      'blocks.hero-section': BlocksHeroSection;
      'blocks.projects-section': BlocksProjectsSection;
      'blocks.technologies-section': BlocksTechnologiesSection;
      'elements.contact-form': ElementsContactForm;
      'elements.link': ElementsLink;
      'elements.logo': ElementsLogo;
      'elements.nav-link': ElementsNavLink;
      'elements.project-card': ElementsProjectCard;
      'elements.project-link': ElementsProjectLink;
      'elements.subtext': ElementsSubtext;
      'elements.technology': ElementsTechnology;
      'elements.technology-card': ElementsTechnologyCard;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
    }
  }
}

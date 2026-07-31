(() => {
  const data = window.CV_DATA;
  const root = document.querySelector("#cv");

  if (!data || !root) {
    throw new Error("CV data or render target is missing");
  }

  const element = (tag, className, text) => {
    const node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  };

  const divider = () => element("div", "break");

  const renderHeader = () => {
    const header = element("header", "header");
    header.append(
      element("h1", "name", data.person.name),
      element("p", "title", data.person.title),
    );
    return header;
  };

  const renderContacts = () => {
    const contacts = element("section", "info");
    contacts.append(element("h2", "visually-hidden", "Contact details"));

    data.contacts.forEach((contact) => {
      const row = element("div");
      const icon = element("img");
      icon.src = contact.icon;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");

      const text = contact.href
        ? element("a", "", contact.text)
        : element("span", "", contact.text);

      if (contact.href) {
        text.href = contact.href;
      }

      text.setAttribute("aria-label", contact.label);
      row.append(icon, text);
      contacts.append(row);
    });

    return contacts;
  };

  const renderListSection = (title, items) => {
    const section = element("section", "capabilities");
    section.append(element("h2", "category", title));
    items.forEach((item) => section.append(element("span", "", item)));
    return section;
  };

  const renderLanguages = () => {
    const section = element("section", "capabilities");
    section.append(element("h2", "category", "LANGUAGES"));

    data.languages.forEach((language) => {
      section.append(
        element("h3", "category", language.name),
        element("span", "", language.proficiency),
      );
    });

    return section;
  };

  const renderAchievements = (items) => {
    const list = element("ul", "achievements");
    items.forEach((item) => list.append(element("li", "", item)));
    return list;
  };

  const renderExperience = (experience, achievementRange) => {
    const fragment = document.createDocumentFragment();
    fragment.append(element("h3", "company", experience.company));

    const role = element("article", "role");
    role.append(
      element("h4", "position", experience.position),
      element("span", "duration", experience.duration),
    );

    if (experience.summary) {
      role.append(element("p", "description", experience.summary));
    }

    const achievements = achievementRange
      ? experience.achievements.slice(...achievementRange)
      : experience.achievements;

    if (achievements.length) {
      role.append(renderAchievements(achievements));
    }

    fragment.append(role);
    return fragment;
  };

  const renderExperienceContinuation = (experience, startIndex) => {
    const role = element("section", "role continuation");
    role.append(
      element(
        "h2",
        "visually-hidden",
        `${experience.company} experience continued`,
      ),
    );
    role.append(renderAchievements(experience.achievements.slice(startIndex)));
    return role;
  };

  const renderCertificates = () => {
    const section = element("section", "cv-section certificates");
    section.append(element("h2", "title spaced", "CERTIFICATES"));

    data.certificates.forEach((certificate) => {
      const item = element("article", "certificate");
      item.append(
        element("h3", "position", certificate.name),
        element("span", "description", certificate.description),
      );
      section.append(item);
    });

    return section;
  };

  const renderEducation = () => {
    const section = element("section", "cv-section education");
    section.append(element("h2", "title spaced", "EDUCATION"));

    data.education.forEach((education) => {
      const item = element("article", "role education-item");
      item.append(
        element("h3", "position", education.degree),
        element("span", "duration", education.duration),
        element("span", "description", education.description),
      );
      section.append(item);
    });

    return section;
  };

  const renderFooter = () => {
    const footer = element("footer", "footer");
    footer.append(divider(), element("p", "", data.consent));
    return footer;
  };

  const createPage = (number, sidebar, mainContent) => {
    const sheet = element("section", "page-sheet");
    sheet.dataset.page = String(number);
    sheet.setAttribute("aria-label", `CV page ${number} of 2`);

    const page = element("div", "page");
    const content = element("div", "content");
    const sidebarColumn = element("aside", "column c1");
    const mainColumn = element("section", "column c2 experience");

    sidebarColumn.append(...sidebar);
    mainColumn.append(...mainContent);
    content.append(sidebarColumn, mainColumn);
    page.append(content, renderFooter());
    sheet.append(page);
    return sheet;
  };

  const pageOneSidebar = [
    renderHeader(),
    divider(),
    renderContacts(),
    divider(),
    renderListSection("QA SKILLS", data.skills.qa),
    divider(),
    renderListSection("DevOps, CI & CD", data.skills.devOps),
  ];

  const pageOneExperience = element("section");
  pageOneExperience.append(element("h2", "title", "EXPERIENCE"));
  pageOneExperience.append(renderExperience(data.experience[0]));
  pageOneExperience.append(renderExperience(data.experience[1]));
  pageOneExperience.append(renderExperience(data.experience[2], [0, 2]));

  const pageTwoSidebar = [
    renderListSection("KNOWLEDGE", data.skills.knowledge),
    divider(),
    renderLanguages(),
  ];

  root.append(
    createPage(1, pageOneSidebar, [pageOneExperience]),
    createPage(2, pageTwoSidebar, [
      renderExperienceContinuation(data.experience[2], 2),
      renderCertificates(),
      renderEducation(),
    ]),
  );
})();

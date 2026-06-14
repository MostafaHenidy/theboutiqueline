const { Op } = require('sequelize');
const { sequelize, LandingPage, LandingPageSection, LandingPageView, LandingPageOrder, Product } = require('../models');
const { storefrontProductImagesInclude } = require('../utils/productIncludes');

const makeSlug = (title) => {
  const base = title.replace(/\s+/g, '-').replace(/[^\w؀-ۿ-]/g, '').toLowerCase();
  return `${base}-${Date.now().toString(36)}`;
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getLandingPages = async (req, res, next) => {
  try {
    const pages = await LandingPage.findAll({
      include: [{ model: Product, as: 'product', attributes: ['id', 'name_ar', 'name_en', 'thumbnail', 'slug'] }],
      order: [['created_at', 'DESC']],
    });
    const result = await Promise.all(pages.map(async (p) => {
      const [views, orders] = await Promise.all([
        LandingPageView.count({ where: { landing_page_id: p.id } }),
        LandingPageOrder.count({ where: { landing_page_id: p.id } }),
      ]);
      return { ...p.toJSON(), views, orders };
    }));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createLandingPage = async (req, res, next) => {
  try {
    const { title_ar, title_en, product_id, settings, meta_title, meta_description } = req.body;
    const slug = makeSlug(title_ar || title_en || 'page');
    const page = await LandingPage.create({ title_ar, title_en, slug, product_id, settings: settings || {}, meta_title, meta_description });
    res.status(201).json({ success: true, data: page });
  } catch (err) { next(err); }
};

exports.getLandingPage = async (req, res, next) => {
  try {
    const page = await LandingPage.findByPk(req.params.id, {
      include: [
        {
          model: LandingPageSection, as: 'sections',
          separate: true, order: [['sort_order', 'ASC']],
        },
        {
          model: Product, as: 'product',
          include: [{ ...storefrontProductImagesInclude, attributes: ['id', 'url', 'sort_order'] }],
        },
      ],
    });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) { next(err); }
};

exports.updateLandingPage = async (req, res, next) => {
  try {
    const page = await LandingPage.findByPk(req.params.id);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    await page.update(req.body);
    res.json({ success: true, data: page });
  } catch (err) { next(err); }
};

exports.deleteLandingPage = async (req, res, next) => {
  try {
    const page = await LandingPage.findByPk(req.params.id);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    await Promise.all([
      LandingPageSection.destroy({ where: { landing_page_id: page.id } }),
      LandingPageView.destroy({ where: { landing_page_id: page.id } }),
      LandingPageOrder.destroy({ where: { landing_page_id: page.id } }),
    ]);
    await page.destroy();
    res.json({ success: true, message: 'Page deleted' });
  } catch (err) { next(err); }
};

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.json({ success: true, url: req.file.path });
  } catch (err) { next(err); }
};

// ─── Sections ────────────────────────────────────────────────────────────────

exports.addSection = async (req, res, next) => {
  try {
    const { type, content, settings } = req.body;
    const maxOrder = await LandingPageSection.max('sort_order', { where: { landing_page_id: req.params.id } });
    const section = await LandingPageSection.create({
      landing_page_id: req.params.id,
      type,
      content: content || getDefaultContent(type),
      settings: settings || {},
      sort_order: (maxOrder || 0) + 1,
    });
    res.status(201).json({ success: true, data: section });
  } catch (err) { next(err); }
};

exports.updateSection = async (req, res, next) => {
  try {
    const section = await LandingPageSection.findByPk(req.params.sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    await section.update(req.body);
    res.json({ success: true, data: section });
  } catch (err) { next(err); }
};

exports.deleteSection = async (req, res, next) => {
  try {
    await LandingPageSection.destroy({ where: { id: req.params.sectionId } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.reorderSections = async (req, res, next) => {
  try {
    const { sections } = req.body;
    await Promise.all(sections.map(({ id, sort_order }) =>
      LandingPageSection.update({ sort_order }, { where: { id } })
    ));
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ─── Analytics ───────────────────────────────────────────────────────────────

exports.getAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = await LandingPage.findByPk(id);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalViews, monthViews, weekViews, totalOrders, monthOrders] = await Promise.all([
      LandingPageView.count({ where: { landing_page_id: id } }),
      LandingPageView.count({ where: { landing_page_id: id, created_at: { [Op.gte]: thirtyDaysAgo } } }),
      LandingPageView.count({ where: { landing_page_id: id, created_at: { [Op.gte]: sevenDaysAgo } } }),
      LandingPageOrder.count({ where: { landing_page_id: id } }),
      LandingPageOrder.count({ where: { landing_page_id: id, created_at: { [Op.gte]: thirtyDaysAgo } } }),
    ]);

    const dailyViews = await LandingPageView.findAll({
      where: { landing_page_id: id, created_at: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    const conversionRate = totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: { totalViews, monthViews, weekViews, totalOrders, monthOrders, conversionRate, dailyViews },
    });
  } catch (err) { next(err); }
};

// ─── Public ───────────────────────────────────────────────────────────────────

exports.getPublicLandingPage = async (req, res, next) => {
  try {
    const page = await LandingPage.findOne({
      where: { slug: req.params.slug, status: 'published' },
      include: [
        {
          model: LandingPageSection, as: 'sections',
          where: { is_visible: true }, required: false,
          separate: true, order: [['sort_order', 'ASC']],
        },
        {
          model: Product, as: 'product',
          where: { is_active: true }, required: false,
          include: [{ ...storefrontProductImagesInclude, attributes: ['id', 'url', 'sort_order'] }],
        },
      ],
    });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (err) { next(err); }
};

exports.trackView = async (req, res, next) => {
  try {
    await LandingPageView.create({
      landing_page_id: req.params.id,
      ip_address: (req.ip || '').substring(0, 45),
      user_agent: (req.headers['user-agent'] || '').substring(0, 300),
    });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.trackConversion = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    const exists = await LandingPageOrder.findOne({ where: { landing_page_id: req.params.id, order_id } });
    if (!exists) await LandingPageOrder.create({ landing_page_id: req.params.id, order_id });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultContent(type) {
  const defaults = {
    hero: {
      title_ar: 'عنوان رئيسي جذاب', title_en: 'Attractive Main Title',
      subtitle_ar: 'وصف قصير يشرح المنتج أو العرض', subtitle_en: 'Short description for the product or offer',
      cta_text_ar: 'اشتري الآن', cta_text_en: 'Buy Now', cta_link: '',
      bg_color: '#1a1a2e', text_color: '#ffffff', overlay_opacity: 0.4, min_height: '500',
    },
    product: {
      show_price: true, show_variants: true, show_buy_button: true,
      buy_button_text_ar: 'أضف إلى السلة', buy_button_text_en: 'Add to Cart',
      layout: 'image-left', bg_color: '#ffffff',
    },
    features: {
      title_ar: 'لماذا تختارنا؟', title_en: 'Why Choose Us?',
      bg_color: '#f8f9fa', text_color: '#1a1a1a', columns: 3,
      items: [
        { icon: 'Shield', title_ar: 'جودة عالية', title_en: 'High Quality', desc_ar: 'منتجات مصنوعة بأعلى معايير الجودة', desc_en: 'Products made to highest quality standards' },
        { icon: 'Truck', title_ar: 'شحن سريع', title_en: 'Fast Shipping', desc_ar: 'توصيل سريع لباب منزلك', desc_en: 'Fast delivery to your doorstep' },
        { icon: 'RefreshCw', title_ar: 'استرداد سهل', title_en: 'Easy Returns', desc_ar: 'سياسة استرداد مرنة لراحتك', desc_en: 'Flexible return policy for your comfort' },
      ],
    },
    countdown: {
      title_ar: 'العرض ينتهي خلال', title_en: 'Offer Ends In',
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      bg_color: '#1a1a2e', text_color: '#ffffff', accent_color: '#d4af37',
    },
    text: {
      html_ar: '<h2>عنوان القسم</h2><p>اكتب محتواك هنا...</p>',
      html_en: '<h2>Section Title</h2><p>Write your content here...</p>',
      text_align: 'center', bg_color: '#ffffff', text_color: '#1a1a1a', padding: 'normal',
    },
    image: {
      src: '', alt_ar: '', alt_en: '', caption_ar: '', caption_en: '', link: '', full_width: true,
    },
    testimonials: {
      title_ar: 'آراء عملائنا', title_en: 'Customer Reviews',
      bg_color: '#f8f9fa', text_color: '#1a1a1a',
      items: [
        { name: 'سارة أحمد', text_ar: 'منتج رائع وجودة ممتازة، سأشتري مرة أخرى بالتأكيد!', rating: 5, avatar: '' },
        { name: 'محمد علي', text_ar: 'خدمة توصيل سريعة والمنتج أفضل من توقعاتي.', rating: 5, avatar: '' },
        { name: 'فاطمة خالد', text_ar: 'تجربة شراء ممتازة، أنصح الجميع بالشراء.', rating: 4, avatar: '' },
      ],
    },
    stats: {
      bg_color: '#1a1a2e', text_color: '#ffffff', accent_color: '#d4af37',
      items: [
        { value: '+5000', label_ar: 'عميل سعيد', label_en: 'Happy Customers' },
        { value: '+200', label_ar: 'منتج متاح', label_en: 'Products Available' },
        { value: '4.9', label_ar: 'تقييم المتجر', label_en: 'Store Rating' },
        { value: '+3', label_ar: 'سنوات خبرة', label_en: 'Years Experience' },
      ],
    },
    cta: {
      title_ar: 'لا تفوت هذا العرض!', title_en: "Don't Miss This Offer!",
      subtitle_ar: 'احصل على أفضل المنتجات بأسعار لا تصدق', subtitle_en: 'Get the best products at incredible prices',
      button_text_ar: 'تسوق الآن', button_text_en: 'Shop Now',
      button_link: '/products',
      bg_color: '#d4af37', text_color: '#1a1a1a', button_color: '#1a1a1a', button_text_color: '#ffffff',
    },
    gallery: {
      title_ar: 'معرض الصور', title_en: 'Gallery',
      bg_color: '#ffffff', columns: 3,
      images: [],
    },
  };
  return defaults[type] || {};
}

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Banner = sequelize.define('Banner', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title_ar: { type: DataTypes.STRING(200) },
  title_en: { type: DataTypes.STRING(200) },
  subtitle_ar: { type: DataTypes.STRING(300) },
  subtitle_en: { type: DataTypes.STRING(300) },
  image: { type: DataTypes.STRING(500) },
  mobile_image: { type: DataTypes.STRING(500) },
  link: { type: DataTypes.STRING(300) },
  type: { type: DataTypes.ENUM('hero','promotion','category','brand'), defaultValue: 'hero' },
  position: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  starts_at: { type: DataTypes.DATE },
  ends_at: { type: DataTypes.DATE },
}, { tableName: 'banners' });

module.exports = Banner;

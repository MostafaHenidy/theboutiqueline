const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  method: { type: DataTypes.ENUM('stripe','cod','bank_transfer','paymob'), allowNull: false },
  status: { type: DataTypes.ENUM('pending','completed','failed','refunded'), defaultValue: 'pending' },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING(5), defaultValue: 'EGP' },
  stripe_payment_intent_id: { type: DataTypes.STRING(200) },
  stripe_charge_id: { type: DataTypes.STRING(200) },
  bank_transfer_reference: { type: DataTypes.STRING(200) },
  bank_transfer_proof: { type: DataTypes.STRING(500) },
  transaction_id: { type: DataTypes.STRING(200) },
  paid_at: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'payments' });

module.exports = Payment;

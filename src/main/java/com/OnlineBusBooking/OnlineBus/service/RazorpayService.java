package com.OnlineBusBooking.OnlineBus.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RazorpayService {

    @Value("${razorpay.api.key}")
    private String apiKey;

    @Value("${razorpay.api.secret}")
    private String apiSecret;

    public Order createOrder(int amount, String currency, String receiptId) throws RazorpayException {
        RazorpayClient razorpayClient = new RazorpayClient(apiKey, apiSecret);
        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amount);  // Amount should already be in paise
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", receiptId);
        orderRequest.put("payment_capture", true);

        return razorpayClient.orders.create(orderRequest);
    }
}

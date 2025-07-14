package com.OnlineBusBooking.OnlineBus.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.LocalDate;

@Data
@Document(collection = "trip_schedules")
public class TripSchedule {
    @Id
    private String id;
    private String busId;
    private String routeId;

    @Field(targetType = FieldType.STRING)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate date;

    private String departureTime;
    private String arrivalTime;
}